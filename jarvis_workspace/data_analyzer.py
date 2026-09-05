# data_analyzer.py - Test Script for JARVIS
import os


def calculate_metrics(data_list):
    """Calculates basic math summaries for a list of metrics."""
    if not data_list:
        return {"error": "Empty dataset"}

    total = sum(data_list)
    average = total / len(data_list)
    return {
        "sum": total,
        "mean": average,
        "count": len(data_list),
    }


if __name__ == "__main__":
    print("Analytics core initialized successfully.")
