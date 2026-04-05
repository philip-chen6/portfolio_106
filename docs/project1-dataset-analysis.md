# Project 1 Dataset Analysis

## What the dataset is

`../project1/grocerydb.csv` is a grocery product dataset containing packaged food items from three stores:

- `WholeFoods`
- `Walmart`
- `Target`

Each row is a product listing with store metadata, a product category, brand, price, package weight, several nutrition fields, and two processing-related variables:

- `FPro`: a continuous food-processing score from about `0` to `1`
- `FPro_class`: a discrete class from `0` to `3`

The score behaves like a processed-food index:

- low values appear on raw or minimally processed items like meat, seafood, eggs, coffee beans, and produce
- high values appear on breads, buns, cookies, chips, snack foods, cake mixes, and similar packaged foods

## Quick profile

- Rows: `26,250`
- Columns: `16`
- Stores: `3`
- Categories: `52`
- Brands: `3,408`
- Distinct product names: `25,847`

Most common stores:

- `WholeFoods`: `10,851`
- `Walmart`: `8,896`
- `Target`: `6,503`

Most common categories:

- `prepared-meals-dishes`: `2,043`
- `pastry-chocolate-candy`: `1,529`
- `snacks-bars`: `1,402`
- `cookies-biscuit`: `1,228`
- `snacks-mixes-crackers`: `1,116`

## Data quality notes

- `brand` has `69` missing values
- `price` has `4,030` missing values
- `price percal` has `5,470` missing values
- `package_weight` has `1,275` missing values
- `Sugars, total` and `Fiber, total dietary` each have `9` missing values

There are also a few strong outliers in the nutrition and weight columns, so anything using means should be paired with medians or trimmed summaries.

## Main patterns

Average `FPro` by store:

- `Target`: `0.8005`
- `Walmart`: `0.7643`
- `WholeFoods`: `0.6580`

Most processed categories by average `FPro`:

- `cookies-biscuit`: `0.9254`
- `cakes`: `0.9151`
- `bread`: `0.9080`
- `muffins-bagels`: `0.9071`
- `snacks-chips`: `0.8814`

Least processed categories by average `FPro`:

- `coffee-beans-wf`: `0.1012`
- `meat-poultry-wf`: `0.1177`
- `seafood-wf`: `0.2022`
- `eggs-wf`: `0.2199`
- `produce-beans-wf`: `0.2604`

`FPro_class` distribution:

- class `0`: `3,313`
- class `1`: `616`
- class `2`: `2,426`
- class `3`: `19,895`

That means the dataset is heavily skewed toward more processed grocery products.

## Interpretation

This looks like a merged grocery database meant for studying food processing, nutrition, pricing, and assortment across retailers. A good working description is:

> a cross-store grocery product dataset with nutrition facts, pricing, and a food-processing score for packaged foods and staples sold at Whole Foods, Walmart, and Target

## Reproducibility

Run the local profiler with:

```bash
python3 scripts/analyze_project1_dataset.py
```
