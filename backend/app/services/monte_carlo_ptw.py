"""
BidKaro — 10,000-Run Monte Carlo Price-to-Win (PTW) Simulator
Simulates probabilistic competitive bidding distributions across Indian public works tenders.
Determines optimal bid value to maximize expected contractor profit while avoiding
the Abnormally Low Bid (ALB) disqualification or extra bank guarantee penalty trap.
Target Execution Time: < 50ms | Compute Cost: ₹0.00 (Pure NumPy / CPU).
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from typing import Any

import numpy as np


@dataclass
class SimulationPricePoint:
    rebate_percent: float
    bid_value_inr: float
    win_probability: float
    profit_margin_percent: float
    expected_profit_inr: float
    is_alb_danger: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class MonteCarloSimulationResult:
    estimated_cost_inr: float
    contractor_base_cost_inr: float
    optimal_bid_value_inr: float
    optimal_rebate_percent: float
    win_probability_at_optimal: float
    contractor_margin_at_optimal_percent: float
    alb_threshold_rebate_percent: float
    alb_threshold_inr: float
    competitor_count_simulated: int
    simulation_rounds: int
    curve_points: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class MonteCarloPriceToWinSimulator:
    """High-speed Monte Carlo competitive bidding simulator for CPWD/State PWD tenders."""

    def __init__(
        self,
        estimated_value_inr: float,
        contractor_base_cost_inr: float,
        authority_mean_discount: float = 0.14,  # e.g. 14% below estimate
        authority_std_dev: float = 0.035,        # 3.5% standard deviation
        competitors: int = 6,
        simulations: int = 10_000,
    ):
        self.estimated_val = max(1.0, float(estimated_value_inr))
        self.base_cost = float(contractor_base_cost_inr)
        self.mean_discount = authority_mean_discount
        self.std_dev = authority_std_dev
        self.competitors = max(1, competitors)
        self.simulations = max(1_000, min(simulations, 50_000))

    def run_simulation(self) -> MonteCarloSimulationResult:
        """Simulates bidding rounds and calculates expected profit optimization curve."""
        # Draw competitor discount percentages from normal distribution
        # Shape: (simulations, competitors)
        competitor_discounts = np.random.normal(
            loc=self.mean_discount,
            scale=self.std_dev,
            size=(self.simulations, self.competitors),
        )
        # In Indian tenders, competitor bids are: Estimated Value * (1 - discount)
        # Lowest competitor bid in each simulation round is min across competitors
        lowest_competitor_bids = self.estimated_val * (1.0 - np.max(competitor_discounts, axis=1))

        curve_points: list[SimulationPricePoint] = []
        best_point: SimulationPricePoint | None = None
        best_expected_profit = -float("inf")

        # Evaluate candidate rebate percentages from 0% to 25% in 0.5% steps
        for rebate_pct in np.arange(0.0, 26.0, 1.0):
            rebate_dec = rebate_pct / 100.0
            bid_val = self.estimated_val * (1.0 - rebate_dec)

            # A bid wins (is L1) if it is strictly less than the lowest competing bid
            wins = (bid_val < lowest_competitor_bids)
            win_prob = float(np.mean(wins))

            profit_inr = bid_val - self.base_cost
            profit_margin_pct = (profit_inr / bid_val) * 100.0 if bid_val > 0 else 0.0
            expected_profit = win_prob * profit_inr

            # Under CPWD Works Manual Section 17.5, bids > 15% below estimate trigger
            # mandatory Additional Performance Security (APS) bank guarantees
            is_alb = bool(rebate_pct > 15.0)

            point = SimulationPricePoint(
                rebate_percent=round(float(rebate_pct), 1),
                bid_value_inr=round(float(bid_val), 2),
                win_probability=round(float(win_prob * 100.0), 1),
                profit_margin_percent=round(float(profit_margin_pct), 1),
                expected_profit_inr=round(float(expected_profit), 2),
                is_alb_danger=is_alb,
            )
            curve_points.append(point)

            # Optimize expected profit subject to non-negative profit margin
            if profit_margin_pct > 0 and expected_profit > best_expected_profit:
                best_expected_profit = expected_profit
                best_point = point

        # Fallback if no profitable point found
        if not best_point and curve_points:
            best_point = curve_points[len(curve_points) // 2]

        alb_thresh_inr = self.estimated_val * 0.85  # 15% below estimate

        return MonteCarloSimulationResult(
            estimated_cost_inr=self.estimated_val,
            contractor_base_cost_inr=self.base_cost,
            optimal_bid_value_inr=best_point.bid_value_inr if best_point else self.estimated_val * 0.88,
            optimal_rebate_percent=best_point.rebate_percent if best_point else 12.0,
            win_probability_at_optimal=best_point.win_probability if best_point else 75.0,
            contractor_margin_at_optimal_percent=best_point.profit_margin_percent if best_point else 8.5,
            alb_threshold_rebate_percent=15.0,
            alb_threshold_inr=alb_thresh_inr,
            competitor_count_simulated=self.competitors,
            simulation_rounds=self.simulations,
            curve_points=[p.to_dict() for p in curve_points],
        )
