document.addEventListener('DOMContentLoaded', () => {
    const leaderboard = JSON.parse(localStorage.getItem('tetris.leaderboard')) || {};

    const leaderboardArray = Object.entries(leaderboard)
        .map(([username, data]) => ({ username, score: data.score }))
        .sort((a, b) => b.score - a.score); // Сортируем по убыванию очков

    let table = document.querySelector("body > main > div > table > tbody");
    leaderboardArray.forEach((entry, index) => {
        let tableRow = table.insertRow();
        let cellNo = tableRow.insertCell();
        let cellName = tableRow.insertCell();
        let cellScore = tableRow.insertCell();

        cellNo.innerHTML = (index + 1).toString();
        cellName.innerHTML = entry.username;
        cellScore.innerHTML = entry.score.toString();
        table.appendChild(tableRow);
    });
});