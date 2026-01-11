const canvas = document.getElementById("draw");
    const sample = document.getElementById("sample");
    const PIXEL = 10;
    const resultDiv = document.getElementById("result");

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
        clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const brush = [
      { dx: 0, dy: 0, a: 1.0 }, // center
      { dx: 1, dy: 0, a: 0.4 },
      { dx: -1, dy: 0, a: 0.4 },
      { dx: 0, dy: 1, a: 0.4 },
      { dx: 0, dy: -1, a: 0.4 },
      { dx: 1, dy: 1, a: 0.2 },
      { dx: -1, dy: 1, a: 0.2 },
      { dx: 1, dy: -1, a: 0.2 },
      { dx: -1, dy: -1, a: 0.2 },
    ];
    let drawing = false;
    let lastX = null;
    let lastY = null;

    canvas.addEventListener("mousedown", (e) => {
      drawing = true;
      lastX = e.offsetX;
      lastY = e.offsetY;
      draw(e);
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!drawing) return;
      interpolate(lastX, lastY, e.offsetX, e.offsetY);
      lastX = e.offsetX;
      lastY = e.offsetY;
    });

    canvas.addEventListener("mouseup", () => {
      drawing = false;
      lastX = lastY = null;
    });

    function interpolate(x0, y0, x1, y1) {
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.ceil(dist / PIXEL);

      for (let i = 0; i < steps; i++) {
        const x = x0 + (x1 - x0) * (i / steps);
        const y = y0 + (y1 - y0) * (i / steps);
        draw({ offsetX: x, offsetY: y });
      }
    }

    function draw(e) {
      const x = Math.floor(e.offsetX / PIXEL) * PIXEL;
      const y = Math.floor(e.offsetY / PIXEL) * PIXEL;

      brush.forEach((p) => {
        ctx.fillStyle = `rgba(255,255,255,${p.a})`;
        ctx.fillRect(x + p.dx * PIXEL, y + p.dy * PIXEL, PIXEL, PIXEL);
      });
    }

    function clearCanvas() {
      ctx.fillStyle = "rgb(0,0,0)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function reset() {
      document.querySelectorAll("img.sample").forEach((image) => image.remove());
	  clearCanvas();
    }

    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = 28;
    smallCanvas.height = 28;
    const smallCtx = smallCanvas.getContext("2d", { willReadFrequently: true });

    smallCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 28, 28);

    function downscaleTo28x28() {
      smallCtx.fillStyle = "black";
      smallCtx.fillRect(0, 0, 28, 28);
      smallCtx.drawImage(canvas,0,0,canvas.width,canvas.height,0,0,28,28);
      return smallCtx.getImageData(0, 0, 28, 28);
    }

    function imageDataToMNIST(imageData) {
      const pixels = [];
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const gray = (r + g + b) / 3;
        pixels.push(gray / 255);
      }

      return pixels;
    }
    async function classify() {
      const container = document.createElement("div");  
      container.style.display = "inline-flex";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.flexDirection = "column";
      const img = document.createElement("img");
        img.src = canvas.toDataURL();
	      img.className = "sample";
        img.style.imageRendering = "pixelated";
        img.style.width = "100px";
        img.style.margin = "10px";
        container.append(img);

        const imageData = downscaleTo28x28();
        const pixels = imageDataToMNIST(imageData);
	    // console.log(pixels);
        const response = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ pixels }),
        });

        const result = await response.json();
        console.log(result);

        resultDiv.innerHTML = `
            <h2 class="prediction">${result.prediction}</h2>
            <p class="confidence">Confidence: ${(result.confidence * 100).toFixed(2)}%</p>
            <!-- <h3>Probabilities:</h3>
            <ul>
                ${result.probabilities.map((prob, index) =>`<li>${index}: ${(prob * 100).toFixed(2)}%</li>`).join("")}
            </ul> -->
            `;

        const labelDiv = document.createElement("span");
        labelDiv.className = "label";
        labelDiv.style.backgrodund = "rgba(0,0,0,0.5)";
        labelDiv.style.fontWeight = "700";
        labelDiv.innerText = result.prediction;
        container.append(labelDiv);

        sample.prepend(container);
    }

    canvas.addEventListener("click", debounce(classify, 100));

    