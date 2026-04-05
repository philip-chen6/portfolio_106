#!/usr/bin/env python3

"""Profile the sibling project1 grocery dataset with standard-library tools."""

from __future__ import annotations

import csv
from collections import Counter, defaultdict
from pathlib import Path


DATASET_PATH = Path(__file__).resolve().parent.parent.parent / "project1" / "grocerydb.csv"

TEXT_COLUMNS = ["name", "store", "category", "brand"]
NUMERIC_COLUMNS = [
    "FPro",
    "FPro_class",
    "price",
    "price percal",
    "package_weight",
    "Protein",
    "Total Fat",
    "Carbohydrate",
    "Sugars, total",
    "Fiber, total dietary",
    "Sodium",
    "Cholesterol",
]


def quantile(sorted_values: list[float], p: float) -> float:
    index = round((len(sorted_values) - 1) * p)
    return sorted_values[index]


def summarize_dataset(path: Path) -> None:
    missing = Counter()
    unique = {column: set() for column in TEXT_COLUMNS}
    numeric_values = defaultdict(list)
    counts = {column: Counter() for column in ("store", "category", "brand")}
    rows: list[dict[str, str | float | int]] = []
    row_count = 0

    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            row_count += 1

            for column in TEXT_COLUMNS:
                value = row[column].strip()
                if value:
                    unique[column].add(value)
                    if column in counts:
                        counts[column][value] += 1
                else:
                    missing[column] += 1

            for column in NUMERIC_COLUMNS:
                value = row[column].strip()
                if not value:
                    missing[column] += 1
                    continue
                try:
                    numeric_value = float(value)
                except ValueError:
                    missing[column] += 1
                    continue
                numeric_values[column].append(numeric_value)

            rows.append(
                {
                    "name": row["name"],
                    "store": row["store"],
                    "category": row["category"],
                    "brand": row["brand"],
                    "FPro": float(row["FPro"]),
                    "FPro_class": int(float(row["FPro_class"])),
                }
            )

    print(f"Dataset: {path}")
    print(f"Rows: {row_count}")
    print(f"Columns: {len(TEXT_COLUMNS) + len(NUMERIC_COLUMNS)}")

    print("\nUnique values")
    for column in TEXT_COLUMNS:
        print(f"- {column}: {len(unique[column])}")

    print("\nMissing values")
    for column in TEXT_COLUMNS + NUMERIC_COLUMNS:
        print(f"- {column}: {missing[column]}")

    print("\nTop stores")
    for value, count in counts["store"].most_common():
        print(f"- {value}: {count}")

    print("\nTop categories")
    for value, count in counts["category"].most_common(10):
        print(f"- {value}: {count}")

    print("\nTop brands")
    for value, count in counts["brand"].most_common(10):
        print(f"- {value}: {count}")

    print("\nNumeric summaries")
    for column in NUMERIC_COLUMNS:
        values = sorted(numeric_values[column])
        if not values:
            continue
        mean = sum(values) / len(values)
        print(
            f"- {column}: min={values[0]:.4f}, q1={quantile(values, 0.25):.4f}, "
            f"mean={mean:.4f}, median={quantile(values, 0.5):.4f}, "
            f"q3={quantile(values, 0.75):.4f}, max={values[-1]:.4f}"
        )

    class_counts = Counter(int(row["FPro_class"]) for row in rows)
    print("\nFPro class counts")
    for value in sorted(class_counts):
        print(f"- class {value}: {class_counts[value]}")

    store_scores = defaultdict(list)
    category_scores = defaultdict(list)
    for row in rows:
        store_scores[str(row["store"])].append(float(row["FPro"]))
        category_scores[str(row["category"])].append(float(row["FPro"]))

    print("\nAverage FPro by store")
    for store, scores in sorted(
        store_scores.items(), key=lambda item: sum(item[1]) / len(item[1]), reverse=True
    ):
        print(f"- {store}: {sum(scores) / len(scores):.4f} ({len(scores)} items)")

    category_means = [
        (category, sum(scores) / len(scores), len(scores))
        for category, scores in category_scores.items()
        if len(scores) >= 50
    ]

    print("\nMost processed categories by average FPro")
    for category, mean, count in sorted(category_means, key=lambda item: item[1], reverse=True)[:10]:
        print(f"- {category}: {mean:.4f} ({count} items)")

    print("\nLeast processed categories by average FPro")
    for category, mean, count in sorted(category_means, key=lambda item: item[1])[:10]:
        print(f"- {category}: {mean:.4f} ({count} items)")

    print("\nLowest-FPro examples")
    for row in sorted(rows, key=lambda item: float(item["FPro"]))[:10]:
        print(
            f"- {float(row['FPro']):.6f} | class {row['FPro_class']} | "
            f"{row['store']} | {row['category']} | {row['name']}"
        )

    print("\nHighest-FPro examples")
    for row in sorted(rows, key=lambda item: float(item["FPro"]), reverse=True)[:10]:
        print(
            f"- {float(row['FPro']):.6f} | class {row['FPro_class']} | "
            f"{row['store']} | {row['category']} | {row['name']}"
        )


if __name__ == "__main__":
    summarize_dataset(DATASET_PATH)
