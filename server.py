import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from keras.models import load_model

app = Flask(__name__)
CORS(app)

model = load_model("mnist_classifier.keras")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()

    pixels = data["pixels"]
    X = np.array(pixels, dtype=np.float32).reshape(1, 28, 28, 1)

    raw = model.predict(X)
    # probs = softmax(raw, axis=1).numpy()[0]

    return jsonify({
        "prediction": int(np.argmax(raw)),
        "confidence": float(np.max(raw)),
        "probabilities": raw.tolist()
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
