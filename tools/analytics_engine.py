"""Dataset analysis with Pandas when available, stdlib statistics otherwise."""

from __future__ import annotations

import csv
import os
import statistics
from typing import Any, Dict, List

WORKSPACE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "jarvis_workspace")


def _load_numeric_column(path: str) -> List[float]:
    values: List[float] = []
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fields = reader.fieldnames or []
        numeric_key = None
        rows = list(reader)
        if not rows:
            return values
        for key in fields:
            try:
                float(str(rows[0].get(key, "")).replace(",", ""))
                numeric_key = key
                break
            except ValueError:
                continue
        if not numeric_key:
            return values
        for row in rows:
            try:
                values.append(float(str(row.get(numeric_key, "0")).replace(",", "")))
            except ValueError:
                continue
    return values


def pandas_data_analysis(source: str = "") -> str:
    path = (source or "").strip() or os.path.join(WORKSPACE, "sample_sales.csv")
    os.makedirs(WORKSPACE, exist_ok=True)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8", newline="") as handle:
            handle.write("month,sales,customers\nJan,12000,18\nFeb,14160,21\nMar,9800,14\n")

    try:
        import pandas as pd

        frame = pd.read_csv(path)
        numeric = frame.select_dtypes(include="number")
        desc = numeric.describe().to_dict()
        std = {col: float(numeric[col].std() or 0) for col in numeric.columns}
        missing = int(frame.isna().sum().sum())
        return (
            f"Pandas analysis of {os.path.basename(path)}: {len(frame)} rows, "
            f"{missing} missing cells. Std-dev={std}. Summary={desc}."
        )
    except Exception:
        values = _load_numeric_column(path)
        if not values:
            return f"Could not analyze {path}."
        mean = statistics.mean(values)
        stdev = statistics.pstdev(values) if len(values) > 1 else 0.0
        return (
            f"Analyzed {len(values)} numeric values in {os.path.basename(path)}. "
            f"Mean={mean:.2f}, std-dev={stdev:.2f}, min={min(values):.2f}, max={max(values):.2f}."
        )


def ml_model_builder(task: str = "classification") -> str:
    values = [12, 14.1, 9.8, 15.2, 11.4]
    mean = statistics.mean(values)
    try:
        from sklearn.dummy import DummyClassifier
        import numpy as np

        x = np.array(values).reshape(-1, 1)
        y = np.array([1, 1, 0, 1, 0])
        model = DummyClassifier(strategy="most_frequent")
        model.fit(x, y)
        acc = float(model.score(x, y))
        return (
            f"Baseline sklearn DummyClassifier trained for '{task}'. "
            f"Training accuracy={acc:.2f}. Mean feature={mean:.2f}. "
            "Replace with a real labeled dataset before production use."
        )
    except Exception:
        z = [(v - mean) / (statistics.pstdev(values) or 1) for v in values]
        anomalies = [values[i] for i, score in enumerate(z) if abs(score) > 1.5]
        return (
            f"ML builder fallback for '{task}': z-score anomaly scan complete. "
            f"Anomalies={anomalies or 'none'}. Install scikit-learn for model training."
        )
