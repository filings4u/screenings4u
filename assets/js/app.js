const newTest = document.getElementById("newTest");
const testModal = document.getElementById("testModal");

const closeModal = document.getElementById("closeModal");
const cancelModal = document.getElementById("cancelModal");

newTest.addEventListener("click", () => {
    testModal.classList.add("open");
});

closeModal.addEventListener("click", () => {
    testModal.classList.remove("open");
});

cancelModal.addEventListener("click", () => {
    testModal.classList.remove("open");
});

testModal.addEventListener("click", (event) => {

    if (event.target === testModal) {
        testModal.classList.remove("open");
    }

});

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {
        testModal.classList.remove("open");
    }

});