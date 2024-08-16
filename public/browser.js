let skip = 0;

window.onload = generateTodo();

function generateTodo() {
  axios
    .get(`/read-todo?skip=${skip}`)
    .then((res) => {
      console.log(res);

      if (res.data.status !== 200) {
        alert(res.data.message);
        return;
      }
      
      console.log(skip);

      const todos = res.data.data;
      console.log(todos);

      skip += todos.length;
      console.log(skip);

      document.getElementById("item_list").insertAdjacentHTML(
        "beforeend",
        todos
          .map((item) => {
            return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
          <span class="item-text">${item.todo}</span>
          <div>
            <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
          <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
          </div>
          
        </li>`;
          })
          .join("")
      );
    })
    .catch((err) => console.log(err));
}

document.addEventListener("click", (event) => {
  //edit
  if (event.target.classList.contains("edit-me")) {
    const todo_id = event.target.getAttribute("data-id");
    const previousText =
      event.target.parentElement.parentElement.querySelector(
        ".item-text"
      ).textContent;

    const newTodo = prompt("Enter new todo text", previousText);
    console.log(newTodo, "New Todo Text");
    axios
      .post("/edit-todo", { newTodo, todo_id })
      .then((res) => {
        console.log(res, "responseEdit");

        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }
        event.target.parentElement.parentElement.querySelector(
          ".item-text"
        ).innerHTML = newTodo;
      })
      .catch((err) => console.log(err));
  }

  //delete
  else if (event.target.classList.contains("delete-me")) {
    const todo_id = event.target.getAttribute("data-id");

    axios
      .post("/delete-todo", { todo_id })
      .then((res) => {
        console.log(res);

        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }

        event.target.parentElement.parentElement.remove();
      })
      .catch((err) => console.log(err));
  }

  //create todo
  else if (event.target.classList.contains("add_item")) {
    const todo =
      event.target.parentElement.querySelector("#create_field").value;

    axios
      .post("/create-todo", { todo })
      .then((res) => {
        console.log(res);

        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }

        document.getElementById("create_field").value = "";
        if(skip < 5){
        document.getElementById("item_list").insertAdjacentHTML(
          "beforeend",
          `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
          <span class="item-text">${res.data.data.todo}</span>
          <div>
            <button data-id="${res.data.data._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
          <button data-id="${res.data.data._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
          </div>
          
        </li>`
        );}
      })
      .catch((err) => console.log(err));
  }

  //Skip value
  else if(event.target.classList.contains("show_more")){
     generateTodo();
  }

  //logout
  else if (event.target.classList.contains("logout")) {
    console.log("logout");

    axios
      .post("/logout")
      .then((res) => {
        console.log(res);
        window.location.href = "http://localhost:8000/login";
      })
      .catch((err) => console.log(err));
  }

  //logout from all devices
  else if (event.target.classList.contains("logout-all")) {
    console.log("logout from all devices");

    axios
      .post("/logout-from-all")
      .then((res) => {
        console.log(res);
        window.location.href = "http://localhost:8000/login";
      })
      .catch((err) => console.log(err));
  }
});
