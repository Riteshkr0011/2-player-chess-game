const socket = io();

// Get references to the form and input field
const form = document.querySelector("form");
const usernameInput = document.getElementById("username");

// Variable to hold the username
let username = "";

// Add an event listener for the form submission
form.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent the default form submission

    // Save the username from the input field
    username = usernameInput.value;

    // Optionally, you can log the username or use it as needed
    console.log("Username saved:", username);

    // Emit the username to the server if necessary
    // socket.emit("submitName", username);

    // You can also redirect or update the UI here
    window.location.href = "/match";
});
