import sys
import json
import joblib
import pandas as pd
import os


# =========================================================
# LOAD MODEL
# =========================================================

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "model",
    "queue_duration_model.pkl"
)

model = joblib.load(MODEL_PATH)


# =========================================================
# GET INPUT FROM NODE.JS
# =========================================================

try:

    input_data = json.loads(
        sys.argv[1]
    )

except Exception as error:

    print(
        json.dumps({
            "success": False,
            "error": "Invalid input data"
        })
    )

    sys.exit(1)


# =========================================================
# CREATE INPUT DATAFRAME
# =========================================================

try:

    input_df = pd.DataFrame([
        {
            "faculty_id":
                input_data["faculty_id"],

            "appointment_type":
                input_data["appointment_type"],

            "people_ahead_when_joined":
                input_data["people_ahead_when_joined"],

            "queue_length_when_joined":
                input_data["queue_length_when_joined"],

            "hour":
                input_data["hour"],

            "day_of_week":
                input_data["day_of_week"]
        }
    ])


    # =====================================================
    # PREDICT
    # =====================================================

    prediction = model.predict(
        input_df
    )[0]


    prediction = max(
        0,
        float(prediction)
    )


    # =====================================================
    # RETURN RESULT
    # =====================================================

    print(
        json.dumps({
            "success": True,
            "predicted_duration":
                round(prediction, 2)
        })
    )


except Exception as error:

    print(
        json.dumps({
            "success": False,
            "error": str(error)
        })
    )

    sys.exit(1)