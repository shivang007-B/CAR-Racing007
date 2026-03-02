const score = document.querySelector(".score");
const startBtn = document.querySelector(".start");
const gameArea = document.querySelector(".gameArea");
const pauseScreen = document.querySelector("#pauseScreen");
const pauseScore = document.querySelector("#pauseScore");

let player = { speed: 5, score: 0, isGamePaused: false, start: false };
let keys = { ArrowUp: false, ArrowDown: false, ArrowRight: false, ArrowLeft: false };
let lines = [];
let enemies = [];
let car;

startBtn.addEventListener("click", () => start(1));
document.addEventListener("keydown", (e) => {
    if (keys.hasOwnProperty(e.key)) e.preventDefault();
    keys[e.key] = true;
    if (e.code === "Space" && player.start) {
        player.isGamePaused = !player.isGamePaused;
        pauseScreen.classList.toggle("hide");
        if (!player.isGamePaused) window.requestAnimationFrame(playGame);
    }
});
document.addEventListener("keyup", (e) => { keys[e.key] = false; });

function start(level) {
    player.start = true;
    player.isGamePaused = false;
    player.score = 0;
    player.speed = 5;
    lines = [];
    enemies = [];
    
    startBtn.classList.add("hide");
    pauseScreen.classList.add("hide");
    gameArea.innerHTML = "";

    for (let x = 0; x < 5; x++) {
        let line = document.createElement("div");
        line.classList.add("line");
        line.y = x * 200;
        line.style.top = line.y + "px";
        gameArea.appendChild(line);
        lines.push(line);
    }

    car = document.createElement("div");
    car.classList.add("car");
    gameArea.appendChild(car);
    player.x = car.offsetLeft;
    player.y = car.offsetTop;

    for (let x = 0; x < 3; x++) {
        let enemy = document.createElement("div");
        enemy.classList.add("enemy");
        enemy.y = ((x + 1) * 350) * -1;
        enemy.style.top = enemy.y + "px";
        enemy.style.left = Math.floor(Math.random() * 350) + "px";
        gameArea.appendChild(enemy);
        enemies.push(enemy);
    }
    window.requestAnimationFrame(playGame);
}

function playGame() {
    if (player.isGamePaused || !player.start) return;

    lines.forEach(item => {
        if (item.y >= 800) item.y -= 1000;
        item.y += player.speed;
        item.style.top = item.y + "px";
    });

    enemies.forEach(item => {
        if (isCollide(car, item)) endGame();
        if (item.y >= 800) {
            item.y = -300;
            item.style.left = Math.floor(Math.random() * 350) + "px";
        }
        item.y += player.speed;
        item.style.top = item.y + "px";
    });

    let road = gameArea.getBoundingClientRect();
    if (keys.ArrowUp && player.y > 100) player.y -= player.speed;
    if (keys.ArrowDown && player.y < (road.height - 100)) player.y += player.speed;
    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < (road.width - 50)) player.x += player.speed;

    car.style.left = player.x + "px";
    car.style.top = player.y + "px";
    player.score++;
    score.innerText = "Score: " + player.score;
    window.requestAnimationFrame(playGame);
}

function isCollide(a, b) {
    let aRect = a.getBoundingClientRect();
    let bRect = b.getBoundingClientRect();
    return !(aRect.bottom < bRect.top || aRect.top > bRect.bottom || aRect.right < bRect.left || aRect.left > bRect.right);
}

function endGame() {
    player.start = false;
    startBtn.classList.remove("hide");
    score.innerHTML = "Game Over <br> Final Score: " + player.score;
}
