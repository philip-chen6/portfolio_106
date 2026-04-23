console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/", title: "Resume" },
  { url: "https://github.com/philip-chen6", title: "GitHub" },
];

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio_106/";

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname,
  );
  if (a.host !== location.host) {
    a.setAttribute("target", "_blank");
  }
  nav.append(a);
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `                                                                                                                                                                              
    <label class="color-scheme">                                                                                                                                                   
      Theme:                                                
      <select>                                                                                                                                                                     
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>                                                                                                                                       
        <option value="dark">Dark</option>                  
      </select>
    </label>`,
);

let select = document.querySelector(".color-scheme select");

select.addEventListener("input", function (event) {
  document.documentElement.style.setProperty(
    "color-scheme",
    event.target.value,
  );
  localStorage.colorScheme = event.target.value;
});

if ("colorScheme" in localStorage) {
  document.documentElement.style.setProperty(
    "color-scheme",
    localStorage.colorScheme,
  );
  select.value = localStorage.colorScheme;
}

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
  }
}

export function renderProjects(project, containerElement, headingLevel = "h2") {
  containerElement.innerHTML = "";
  project.forEach((p) => {
    const article = document.createElement("article");
    article.innerHTML = `
    <${headingLevel}>${p.title}</${headingLevel}>
    <img src="${p.image}" alt="${p.title}">
    <p>${p.description}</p>
    <p><em>c. ${p.year}</em></p>
    `;
    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
