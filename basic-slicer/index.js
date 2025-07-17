const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.lineWidth = 3;

function getRandomColor() {
      var letters = '0123456789ABCDEF';
      var color = '#';
      for (var i = 0; i < 6; i++) {
              color += letters[Math.floor(Math.random() * 16)];
            }
      return color;
}

for (segment of data) {
    ctx.strokeStyle = getRandomColor();
    ctx.beginPath();
    let first = true;
    for (point of segment) {
        if (first) {
            ctx.moveTo(point[0] * 500, point[1] * 500);
        } else {
            ctx.lineTo(point[0] * 500, point[1] * 500);
        }
        first = false;
    }
    ctx.closePath();
    ctx.stroke();
}
