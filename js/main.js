class EventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    emit(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => listener(...args));
        }
    }
}

class TetrisConfig {
    constructor() {
        this.tetrominoes = {
            'I': [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ],
            'J': [
                [1, 0, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            'L': [
                [0, 0, 1],
                [1, 1, 1],
                [0, 0, 0]
            ],
            'O': [
                [1, 1],
                [1, 1]
            ],
            'S': [
                [0, 1, 1],
                [1, 1, 0],
                [0, 0, 0]
            ],
            'Z': [
                [1, 1, 0],
                [0, 1, 1],
                [0, 0, 0]
            ],
            'T': [
                [0, 1, 0],
                [1, 1, 1],
                [0, 0, 0]
            ]
        };
        this.colors = {
            'I': 'cyan',
            'O': 'yellow',
            'T': 'purple',
            'S': 'green',
            'Z': 'red',
            'J': 'blue',
            'L': 'orange'
        };

        this.fieldShape = {width: 10, height: 20};
        this.gameCanvas = document.getElementById('gameField');
        this.nextPieceCanvas = document.getElementById('nextPiece');
        this.defaultUsername = "Player";
        this.maxFrameRate = 35; // Начальная скорость игры
        this.minFrameRate = 10; // Максимальная скорость игры
        this.rowBase = 2; // Основание степени, используемое для начисления бонусных очков

        this.usernameElement = document.getElementById('username');
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.leaderboardKey = 'tetris.leaderboard';
    }

}

class Tetromino {
    constructor(name, matrix) {
        this.name = name;
        this.matrix = matrix;
    }

    rotate() {
        const n = this.matrix.length - 1;
        return this.matrix.map((row, i) => row.map((val, j) => this.matrix[n - j][i]));
    }
}

class GameField {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.field = this.createEmptyField();
    }

    createEmptyField() {
        let field = [];
        for (let row = -2; row < this.height; row++) {
            field[row] = Array(this.width).fill(0);
        }
        return field;
    }
}

class TetrominoController {
    constructor(tetromino, gameField, row, col, eventEmitter) {
        this.tetromino = tetromino;
        this.gameField = gameField;
        this.row = row;
        this.col = col;
        this.eventEmitter = eventEmitter;
    }

    setTetromino(tetromino, row, col) {
        this.tetromino = tetromino;
        this.row = row;
        this.col = col;
    }

    // Может ли фигура находиться в заданном месте.
    isValidMove(matrix, cellRow, cellCol) {
        // Возвращаем false, если фигура выходит за границы поля или пересекается с другими фигурами
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix[row].length; col++) {
                if (matrix[row][col] && (
                    cellCol + col < 0 || cellCol + col >= this.gameField.width ||
                    cellRow + row >= this.gameField.height || this.gameField.field[cellRow + row][cellCol + col])) {
                    return false;
                }
            }
        }
        return true;
    }

    moveTetromino(offset) {
        const newCol = this.col + offset;
        if (this.isValidMove(this.tetromino.matrix, this.row, newCol)) {
            this.col = newCol;
        }
    }

    rotateTetromino() {
        const rotatedMatrix = this.tetromino.rotate();
        if (this.isValidMove(rotatedMatrix, this.row, this.col)) {
            this.tetromino.matrix = rotatedMatrix;
        }
    }

    dropTetromino() {
        const newRow = this.row + 1;
        if (!this.isValidMove(this.tetromino.matrix, newRow, this.col)) {
            this.placeTetromino();
        } else {
            this.row = newRow;
        }
    }

    placeTetromino() {
        this.tetromino.matrix.forEach((row, rIdx) => row.forEach((cell, cIdx) => {
            if (cell && this.row + rIdx >= 0) {
                this.gameField.field[this.row + rIdx][this.col + cIdx] = this.tetromino.name;
            }
        }));

        let filledRows = 0;

        // Проверяем заполненные ряды и очищаем их снизу вверх.
        for (let row = this.gameField.height - 1; row >= 0; ) {
            // Если ряд заполнен
            if (this.gameField.field[row].every(cell => !!cell)) {
                // Очищаем его и опускаем всё вниз на одну клетку
                for (let r = row; r >= 0; r--) {
                    for (let c = 0; c < this.gameField.field[r].length; c++) {
                        this.gameField.field[r][c] = this.gameField.field[r - 1][c];
                    }
                }

                filledRows++;
            } else {
                row--;
            }
        }

        if (filledRows > 0) {
            this.eventEmitter.emit('rowsFilled', filledRows, this.gameField.width);
        }

        this.eventEmitter.emit('tetrominoPlaced');

        if (!this.isValidMove(this.tetromino.matrix, this.row, this.col)) {
            this.eventEmitter.emit('gameOver');
        }
    }
}

class ScoreManager {
    constructor(config, username, eventEmitter) {
        this.username = username || config.defaultUsername;
        this.score = 0;
        this.level = 1;
        this.maxLevel = config.maxLevel;
        this.rowBase = config.rowBase;

        this.eventEmitter = eventEmitter;
        this.eventEmitter.on('rowsFilled', this.addScore.bind(this));
    }

    addScore(filledRows, fieldWidth) {
        this.score += filledRows * fieldWidth;
        if (filledRows > 1) {
            this.score += this.rowBase ** (filledRows - 1) * fieldWidth;
        }
        this.updateLevel();
        this.eventEmitter.emit('scoreChanged');
    }

    updateLevel() {
        this.level = Math.floor(this.score / 100) + 1;
    }
}

class TetrisGame {
    constructor(config, username) {
        this.tetrominoes = config.tetrominoes;
        this.tetrominoSequence = [];

        this.eventEmitter = new EventEmitter();
        this.gameField = new GameField(config.fieldShape.width, config.fieldShape.height);
        this.tetrominoInfo = this.getNextTetromino();
        this.nextTetrominoInfo = this.getNextTetromino();
        this.tetrominoController = new TetrominoController(this.tetrominoInfo.tetromino, this.gameField, this.tetrominoInfo.row, this.tetrominoInfo.col, this.eventEmitter);
        this.scoreManager = new ScoreManager(config, username, this.eventEmitter);
        this.rAF = null;

        this.isGameOver = false;
        this.frameCount = 0;
        this.minFrameRate = config.minFrameRate;
        this.maxFrameRate = config.maxFrameRate;

        this.eventEmitter.on('tetrominoPlaced', this.updateTetromino.bind(this));
        this.eventEmitter.on('gameOver', this.gameOver.bind(this));
    }

    gameOver() {
        this.isGameOver = true;
        cancelAnimationFrame(this.rAF);
    }

    // Возвращает случайное число из диапазона [min, max].
    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Возвращает массив, в котором элементы перемешаны в случайном порядке.
    getRandomSequence(sequence) {
        const clonedSequence = [...sequence];
        const newSequence = [];
        while (clonedSequence.length) {
            const randomIndex = this.getRandomInt(0, clonedSequence.length - 1);
            newSequence.push(clonedSequence.splice(randomIndex, 1)[0]);
        }
        return newSequence;
    }

    getNextTetromino() {
        if (this.tetrominoSequence.length === 0) {
            this.tetrominoSequence = this.getRandomSequence(Object.keys(this.tetrominoes));
        }

        const name = this.tetrominoSequence.pop();
        const matrix = this.tetrominoes[name];
        const tetromino = new Tetromino(name, matrix)

        // I и O стартуют с середины, остальные — чуть левее
        const col = this.gameField.width / 2 - Math.ceil(matrix[0].length / 2);

        // I начинает с 21 строки (смещение -1), а все остальные — со строки 22 (смещение -2)
        const row = name === 'I' ? -1 : -2;

        return {tetromino, row, col};
    }

    startGameLoop() {
        const gameLoop = () => {
            this.rAF = requestAnimationFrame(gameLoop);

            this.eventEmitter.emit('renderRequested');

            if (++this.frameCount >= Math.max(this.minFrameRate, this.maxFrameRate - this.scoreManager.level)) {
                this.tetrominoController.dropTetromino();
                this.frameCount = 0;
            }
        };

        this.rAF = requestAnimationFrame(gameLoop);
    }

    // Обработка события tetrominoPlaced, установка новой фигуры в контроллере
    updateTetromino() {
        this.tetrominoController.setTetromino(this.nextTetrominoInfo.tetromino, this.nextTetrominoInfo.row, this.nextTetrominoInfo.col);
        this.nextTetrominoInfo = this.getNextTetromino();
    }
}

class Renderer {
    constructor(game, config) {
        this.colors = config.colors;
        this.game = game;
        this.gameCanvas = config.gameCanvas;
        this.gameContext = this.gameCanvas.getContext('2d');
        this.nextPieceCanvas = config.nextPieceCanvas;
        this.nextPieceContext = this.nextPieceCanvas.getContext('2d');

        this.game.eventEmitter.on('gameOver', this.showGameOver.bind(this));
        this.game.eventEmitter.on('renderRequested', this.drawScreen.bind(this));
    }

    // Отвечает за рендер всей игровой области
    drawScreen() {
        this.gameContext.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
        this.nextPieceContext.clearRect(0, 0, this.nextPieceCanvas.width, this.nextPieceCanvas.height);

        this.drawField();
        this.drawTetromino();
        this.drawNextTetromino();
    }

    showGameOver() {
        this.gameContext.fillStyle = 'black';
        this.gameContext.globalAlpha = 0.75;
        this.gameContext.fillRect(0, this.gameCanvas.height / 2 - 30, this.gameCanvas.width, 60);

        this.gameContext.globalAlpha = 1;
        this.gameContext.fillStyle = 'white';
        this.gameContext.font = '36px monospace';
        this.gameContext.textAlign = 'center';
        this.gameContext.textBaseline = 'middle';
        this.gameContext.fillText('Игра окончена', this.gameCanvas.width / 2, this.gameCanvas.height / 2);
    }

    drawField() {
        this.game.gameField.field.forEach((row, rIdx) => row.forEach((cell, cIdx) => {
            if (cell) {
                this.gameContext.fillStyle = this.colors[cell];
                this.gameContext.fillRect(cIdx * (this.gameCanvas.width / this.game.gameField.width),
                    rIdx * (this.gameCanvas.height / this.game.gameField.height), (this.gameCanvas.width / this.game.gameField.width) - 1,
                    (this.gameCanvas.height / this.game.gameField.height) - 1);
            }
        }));
    }

    drawTetromino() {
        this.gameContext.fillStyle = this.colors[this.game.tetrominoController.tetromino.name];
        this.game.tetrominoController.tetromino.matrix.forEach((row, rIdx) => row.forEach((cell, cIdx) => {
            if (cell) {
                this.gameContext.fillRect((this.game.tetrominoController.col + cIdx) * (this.gameCanvas.width / this.game.gameField.width),
                    (this.game.tetrominoController.row + rIdx) * (this.gameCanvas.height / this.game.gameField.height),
                    (this.gameCanvas.width / this.game.gameField.width) - 1, (this.gameCanvas.height / this.game.gameField.height) - 1);
            }
        }));
    }

    drawNextTetromino() {
        this.nextPieceContext.fillStyle = this.colors[this.game.nextTetrominoInfo.tetromino.name];
        this.game.nextTetrominoInfo.tetromino.matrix.forEach((row, rIdx) => row.forEach((cell, cIdx) => {
            if (cell) {
                this.nextPieceContext.fillRect(cIdx * (this.nextPieceCanvas.width / row.length),
                    rIdx * (this.nextPieceCanvas.height / this.game.nextTetrominoInfo.tetromino.matrix.length),
                    (this.nextPieceCanvas.width / row.length) - 1, (this.nextPieceCanvas.height / this.game.nextTetrominoInfo.tetromino.matrix.length) - 1);
            }
        }));
    }
}

class UIManager {
    constructor(scoreManager, config) {
        this.scoreManager = scoreManager;
        this.leaderboardKey = config.leaderboardKey || 'tetris.leaderboard';
        this.usernameElement = config.usernameElement || document.getElementById('username');
        this.levelElement = config.levelElement || document.getElementById('level');
        this.scoreElement = config.scoreElement || document.getElementById('score');

        this.usernameElement.innerHTML = scoreManager.username;
        this.scoreManager.eventEmitter.on('scoreChanged', this.updateScoreboard.bind(this));
        this.scoreManager.eventEmitter.on('gameOver', this.updateLeaderboard.bind(this));
    }

    updateScoreboard() {
        this.scoreElement.innerHTML = this.scoreManager.score.toString();
        this.levelElement.innerHTML = this.scoreManager.level.toString();
    }

    updateLeaderboard() {
        const leaderboard = JSON.parse(localStorage.getItem(this.leaderboardKey)) || {};

        if (leaderboard[this.scoreManager.username]) {
            if (this.scoreManager.score > leaderboard[this.scoreManager.username].score) {
                leaderboard[this.scoreManager.username].score = this.scoreManager.score;
            }
        } else {
            leaderboard[this.scoreManager.username] = {score: this.scoreManager.score};
        }

        const sortedLeaderboard = Object.entries(leaderboard)
            .map(([username, data]) => ({username, score: data.score}))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        const updatedLeaderboard = {};
        sortedLeaderboard.forEach(entry => {
            updatedLeaderboard[entry.username] = { score: entry.score };
        });

        localStorage.setItem(this.leaderboardKey, JSON.stringify(updatedLeaderboard));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let params = new URLSearchParams(document.location.search);
    let value = params.get('username');

    const config = new TetrisConfig();
    const game = new TetrisGame(config, value);
    new Renderer(game, config);
    new UIManager(game.scoreManager, config);

    document.addEventListener('keydown', (event) => {
        if (game.isGameOver) return;

        switch (event.key) {
            case 'ArrowLeft':
                game.tetrominoController.moveTetromino(-1);
                break;
            case 'ArrowRight':
                game.tetrominoController.moveTetromino(1);
                break;
            case 'ArrowDown':
                game.tetrominoController.dropTetromino();
                break;
            case 'ArrowUp':
                game.tetrominoController.rotateTetromino();
                break;
        }
    });

    game.startGameLoop();
});