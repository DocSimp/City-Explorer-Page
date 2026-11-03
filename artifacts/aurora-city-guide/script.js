// Keep list items in this page's memory; they are not saved to the browser.
const likesForm = document.querySelector("#likes-form");
const likeInput = document.querySelector("#like-input");
const likesList = document.querySelector("#likes-list");
const emptyMessage = document.querySelector("#empty-message");

// Add one trimmed item and create a matching remove button.
function addLike(value) {
  const itemText = value.trim();
  if (!itemText) return;

  const item = document.createElement("li");
  const text = document.createElement("span");
  text.textContent = itemText;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-like";
  removeButton.setAttribute("aria-label", `Remove ${itemText}`);
  removeButton.textContent = "×";
  removeButton.addEventListener("click", () => {
    item.remove();
    showEmptyMessageIfNeeded();
  });

  item.append(text, removeButton);
  likesList.append(item);
  emptyMessage.hidden = true;
  likeInput.value = "";
  likeInput.focus();
}

// Bring back the gentle empty state after the last item is removed.
function showEmptyMessageIfNeeded() {
  emptyMessage.hidden = likesList.querySelectorAll("li:not(#empty-message)").length > 0;
}

// A form submit works for both the Add button and Enter key.
likesForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addLike(likeInput.value);
});

// Make the bird image keyboard-operable as well as clickable.
const bird = document.querySelector(".bird");
function shakeBird() {
  bird.classList.remove("shake");
  // Reflow allows a second activation to replay the same CSS animation.
  void bird.offsetWidth;
  bird.classList.add("shake");
}

bird.addEventListener("click", shakeBird);
bird.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    shakeBird();
  }
});
bird.addEventListener("animationend", () => bird.classList.remove("shake"));
