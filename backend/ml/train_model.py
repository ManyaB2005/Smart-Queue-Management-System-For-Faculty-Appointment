import pandas as pd
import mysql.connector
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib
import os


# =========================================================
# DATABASE CONFIGURATION
# =========================================================

DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = "62692"
DB_NAME = "smart_queue_db"


# =========================================================
# CONNECT TO MYSQL
# =========================================================

print("Connecting to MySQL...")

connection = mysql.connector.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME
)

print("MySQL connected successfully.")


# =========================================================
# SQL QUERY
# =========================================================

query = """
SELECT
    faculty_id,
    appointment_type,
    people_ahead_when_joined,
    queue_length_when_joined,

    HOUR(created_at) AS hour,

    DAYOFWEEK(created_at) AS day_of_week,

    actual_duration

FROM Queues

WHERE status = 'completed'

AND actual_duration IS NOT NULL

AND appointment_type IS NOT NULL

AND people_ahead_when_joined IS NOT NULL

AND queue_length_when_joined IS NOT NULL;
"""


# =========================================================
# LOAD DATA INTO PANDAS
# =========================================================

df = pd.read_sql(
    query,
    connection
)

connection.close()


print("\nDataset loaded successfully.")
print("Number of records:", len(df))


# =========================================================
# DISPLAY DATA
# =========================================================

print("\nDataset:")
print(df)


# =========================================================
# CHECK IF DATA IS AVAILABLE
# =========================================================

if len(df) < 2:

    print(
        "\nNot enough data to train the model."
    )

    exit()


# =========================================================
# SAVE DATASET
# =========================================================

os.makedirs(
    "ml/model",
    exist_ok=True
)

df.to_csv(
    "ml/dataset.csv",
    index=False
)

print(
    "\nDataset saved to ml/dataset.csv"
)


# =========================================================
# FEATURES
# =========================================================

X = df[
    [
        "faculty_id",
        "appointment_type",
        "people_ahead_when_joined",
        "queue_length_when_joined",
        "hour",
        "day_of_week"
    ]
]


# =========================================================
# TARGET
# =========================================================

y = df[
    "actual_duration"
]


# =========================================================
# CATEGORICAL FEATURES
# =========================================================

categorical_features = [
    "appointment_type"
]


# =========================================================
# NUMERICAL FEATURES
# =========================================================

numerical_features = [
    "faculty_id",
    "people_ahead_when_joined",
    "queue_length_when_joined",
    "hour",
    "day_of_week"
]


# =========================================================
# PREPROCESSING
# =========================================================

preprocessor = ColumnTransformer(

    transformers=[

        (
            "categorical",

            OneHotEncoder(
                handle_unknown="ignore"
            ),

            categorical_features
        ),

        (
            "numerical",

            "passthrough",

            numerical_features
        )
    ]
)


# =========================================================
# RANDOM FOREST
# =========================================================

model = RandomForestRegressor(

    n_estimators=100,

    random_state=42,

    max_depth=None,

    min_samples_split=2,

    min_samples_leaf=1
)


# =========================================================
# PIPELINE
# =========================================================

pipeline = Pipeline(

    steps=[

        (
            "preprocessor",
            preprocessor
        ),

        (
            "model",
            model
        )
    ]
)


# =========================================================
# TRAIN MODEL
# =========================================================

print(
    "\nTraining Random Forest..."
)

pipeline.fit(
    X,
    y
)


print(
    "Model training completed."
)


# =========================================================
# SAVE MODEL
# =========================================================

model_path = (
    "ml/model/"
    "queue_duration_model.pkl"
)


joblib.dump(
    pipeline,
    model_path
)


print(
    "\nModel saved successfully:"
)

print(
    model_path
)


# =========================================================
# TEST PREDICTIONS
# =========================================================

predictions = pipeline.predict(X)


print(
    "\nPredictions:"
)

for actual, predicted in zip(
    y,
    predictions
):

    print(
        f"Actual: {actual:.0f} sec | "
        f"Predicted: {predicted:.2f} sec"
    )


print(
    "\nML pipeline completed successfully."
)