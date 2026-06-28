import { initFullData, startMap } from "./map-main.js";
import { showLoadingSheep, hideLoadingSheep } from "../sheep.js";
import { finishLoading } from "../loading.js";

var AUTH_KEY = "full-map-auth";

export function initFullAuth() {
  var pwOverlay = document.getElementById("pwOverlay");
  var pwInput = document.getElementById("pwInput");
  var pwBtn = document.getElementById("pwBtn");
  var pwError = document.getElementById("pwError");
  var verifying = false;

  async function tryDecrypt(password) {
    if (verifying) return;
    verifying = true;
    pwBtn.disabled = true;
    pwError.textContent = "";

    try {
      showLoadingSheep();
      await initFullData(password);
      hideLoadingSheep();
      sessionStorage.setItem(AUTH_KEY, password);
      pwOverlay.classList.add("hidden");
      startMap();
      finishLoading();
    } catch (e) {
      hideLoadingSheep();
      sessionStorage.removeItem(AUTH_KEY);
      pwInput.classList.add("error");
      pwError.textContent = "密码错误";
      setTimeout(function () { pwInput.classList.remove("error"); }, 300);
      pwInput.value = "";
      pwBtn.disabled = false;
      pwInput.focus();
    } finally {
      verifying = false;
    }
  }

  pwBtn.addEventListener("click", function () {
    tryDecrypt(pwInput.value.trim());
  });

  pwInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") tryDecrypt(pwInput.value.trim());
  });

  pwInput.addEventListener("input", function () {
    pwError.textContent = "";
    if (pwInput.value.trim().length >= 6) tryDecrypt(pwInput.value.trim());
  });

  // Session restore
  var savedPw = sessionStorage.getItem(AUTH_KEY);
  if (savedPw) {
    tryDecrypt(savedPw);
  }
}
