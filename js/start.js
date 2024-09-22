function storeUsername(source) {
    localStorage["tetris.username"] = source.value;
}

function readUsername(source) {
    const username = localStorage.getItem("tetris.username");
    if (username !== undefined && username !== null && username !== "") {
        source.value = username;
    }
}