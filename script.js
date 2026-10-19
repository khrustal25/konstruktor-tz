(function () {
  "use strict";

  var form = document.getElementById("tz-form");
  var actionsList = document.getElementById("actions-list");
  var addActionBtn = document.getElementById("add-action");
  var clearBtn = document.getElementById("clear-btn");
  var copyBtn = document.getElementById("copy-btn");
  var copyStatus = document.getElementById("copy-status");
  var resultArea = document.getElementById("result");
  var actionIdCounter = 0;
  var lastBuiltDocument = "";
  var copyStatusTimer = null;

  function trimValue(value) {
    return (value || "").trim();
  }

  function hasContent(value) {
    return trimValue(value).length > 0;
  }

  function getRadioValue(name) {
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : "";
  }

  function createActionRow(initialValue) {
    actionIdCounter += 1;
    var id = "action-" + actionIdCounter;
    var row = document.createElement("div");
    row.className = "action-row";
    row.dataset.actionRow = "true";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "action-input";
    input.id = id;
    input.name = "action";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Действие пользователя");
    input.placeholder = "Например: записаться на услугу";
    if (initialValue) {
      input.value = initialValue;
    }

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-remove";
    removeBtn.textContent = "Удалить";
    removeBtn.setAttribute("aria-label", "Удалить действие");
    removeBtn.addEventListener("click", function () {
      var rows = actionsList.querySelectorAll("[data-action-row]");
      if (rows.length <= 1) {
        input.value = "";
        input.focus();
        return;
      }
      row.remove();
      updateRemoveButtons();
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    actionsList.appendChild(row);
    updateRemoveButtons();
    return input;
  }

  function updateRemoveButtons() {
    var rows = actionsList.querySelectorAll("[data-action-row]");
    rows.forEach(function (row) {
      var btn = row.querySelector(".btn-remove");
      if (!btn) return;
      btn.disabled = rows.length <= 1;
      btn.title = rows.length <= 1
        ? "Нужно хотя бы одно поле действия"
        : "Удалить действие";
    });
  }

  function getActions() {
    var inputs = actionsList.querySelectorAll(".action-input");
    var actions = [];
    inputs.forEach(function (input) {
      var value = trimValue(input.value);
      if (value) {
        actions.push(value);
      }
    });
    return actions;
  }

  function clearFieldError(field) {
    field.classList.remove("has-error");
    var errorEl = field.querySelector(".error");
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
  }

  function showFieldError(field, message, focusTarget) {
    field.classList.add("has-error");
    var errorEl = field.querySelector(".error");
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
    return focusTarget || field.querySelector("input, textarea, select");
  }

  function clearAllErrors() {
    form.querySelectorAll(".field.has-error").forEach(clearFieldError);
  }

  function validateForm() {
    clearAllErrors();
    var firstInvalid = null;

    var requiredFields = [
      {
        field: document.getElementById("product-idea").closest(".field"),
        el: document.getElementById("product-idea"),
        message: "Опишите, что хотите создать."
      },
      {
        field: document.getElementById("audience").closest(".field"),
        el: document.getElementById("audience"),
        message: "Укажите, для кого создаётся продукт."
      },
      {
        field: document.getElementById("user-task").closest(".field"),
        el: document.getElementById("user-task"),
        message: "Опишите задачу пользователя."
      }
    ];

    requiredFields.forEach(function (item) {
      if (!hasContent(item.el.value)) {
        var target = showFieldError(item.field, item.message, item.el);
        if (!firstInvalid) firstInvalid = target;
      }
    });

    var actions = getActions();
    var actionsField = form.querySelector("[data-actions-field]");
    if (actions.length === 0) {
      var firstActionInput = actionsList.querySelector(".action-input");
      var target = showFieldError(
        actionsField,
        "Добавьте хотя бы одно действие пользователя.",
        firstActionInput
      );
      if (!firstInvalid) firstInvalid = target;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      if (typeof firstInvalid.scrollIntoView === "function") {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }

    return true;
  }

  function collectData() {
    return {
      projectName: trimValue(document.getElementById("project-name").value),
      productIdea: trimValue(document.getElementById("product-idea").value),
      productType: getRadioValue("productType"),
      audience: trimValue(document.getElementById("audience").value),
      userTask: trimValue(document.getElementById("user-task").value),
      actions: getActions(),
      pages: trimValue(document.getElementById("pages").value),
      inputData: trimValue(document.getElementById("input-data").value),
      outputResult: trimValue(document.getElementById("output-result").value),
      featAuth: getRadioValue("featAuth"),
      featPay: getRadioValue("featPay"),
      featSave: getRadioValue("featSave"),
      featAi: getRadioValue("featAi"),
      outOfScope: trimValue(document.getElementById("out-of-scope").value),
      designWish: trimValue(document.getElementById("design-wish").value),
      references: trimValue(document.getElementById("references").value),
      device: getRadioValue("device"),
      tech: trimValue(document.getElementById("tech").value),
      constraints: trimValue(document.getElementById("constraints").value),
      successSign: trimValue(document.getElementById("success-sign").value),
      mustWork: trimValue(document.getElementById("must-work").value)
    };
  }

  function asMultiline(text) {
    return text;
  }

  function asBulletList(items) {
    return items.map(function (item) {
      return "- " + item;
    }).join("\n");
  }

  function sectionOrClarify(title, content, clarifyQuestion, clarifications) {
    var lines = ["## " + title, ""];
    if (hasContent(content)) {
      lines.push(asMultiline(content));
    } else {
      lines.push("Не указано. Нужно уточнить перед реализацией.");
      if (clarifyQuestion) {
        clarifications.push(clarifyQuestion);
      }
    }
    lines.push("");
    return lines;
  }

  function featureLine(label, value, clarifications, clarifyQuestion, needsServiceNote) {
    var line = "- **" + label + ":** " + value;
    var notes = [];

    if (value === "Пока не знаю") {
      clarifications.push(clarifyQuestion);
      notes.push("статус не определён — не считать принятым решением");
    }

    if (value === "Да" && needsServiceNote) {
      notes.push(
        "отдельно определить сервисы и способ безопасного подключения (без запроса паролей, токенов и секретных ключей в чате)"
      );
    }

    if (notes.length) {
      line += " (" + notes.join("; ") + ")";
    }

    return line;
  }

  function buildDocument(data) {
    var clarifications = [];
    var lines = [];

    lines.push("# Техническое задание");
    lines.push("");

    // 1. Название и описание
    lines.push("## 1. Название и описание продукта");
    lines.push("");
    if (data.projectName) {
      lines.push("**Название:** " + data.projectName);
      lines.push("");
    } else {
      lines.push("**Название:** не указано.");
      lines.push("");
      clarifications.push("Как назвать проект?");
    }
    lines.push("**Тип продукта:** " + data.productType);
    lines.push("");
    lines.push("**Описание:**");
    lines.push(asMultiline(data.productIdea));
    lines.push("");

    // 2. Целевая аудитория
    lines.push("## 2. Целевая аудитория");
    lines.push("");
    lines.push(asMultiline(data.audience));
    lines.push("");

    // 3. Задача и ожидаемый результат
    lines.push("## 3. Задача и ожидаемый результат");
    lines.push("");
    lines.push("**Задача пользователя:**");
    lines.push(asMultiline(data.userTask));
    lines.push("");
    if (hasContent(data.outputResult)) {
      lines.push("**Ожидаемый результат для пользователя:**");
      lines.push(asMultiline(data.outputResult));
    } else {
      lines.push("**Ожидаемый результат для пользователя:** не указан. Нужно уточнить.");
      clarifications.push("Какой результат должен получать пользователь?");
    }
    lines.push("");

    // 4. Состав первой версии
    lines.push("## 4. Состав первой версии");
    lines.push("");
    lines.push("Основные действия пользователя:");
    lines.push(asBulletList(data.actions));
    lines.push("");

    // 5. Основной пользовательский сценарий
    lines.push("## 5. Основной пользовательский сценарий");
    lines.push("");
    lines.push(
      "Последовательность шагов сценария отдельно не описана. Нужно уточнить основной сценарий использования перед реализацией (в каком порядке пользователь выполняет действия)."
    );
    clarifications.push(
      "Как выглядит основной пользовательский сценарий: в каком порядке выполняются действия?"
    );
    lines.push("");

    // 6. Страницы
    Array.prototype.push.apply(
      lines,
      sectionOrClarify(
        "6. Страницы, экраны или разделы",
        data.pages,
        "Какие страницы, экраны или разделы нужны в первой версии?",
        clarifications
      )
    );

    // 7. Данные и результаты
    lines.push("## 7. Вводимые данные и результаты");
    lines.push("");
    if (hasContent(data.inputData)) {
      lines.push("**Вводимые данные:**");
      lines.push(asMultiline(data.inputData));
    } else {
      lines.push("**Вводимые данные:** не указаны. Нужно уточнить.");
      clarifications.push("Какие данные вводит пользователь?");
    }
    lines.push("");
    if (hasContent(data.outputResult)) {
      lines.push("**Результат для пользователя:**");
      lines.push(asMultiline(data.outputResult));
    } else {
      lines.push("**Результат для пользователя:** не указан. Нужно уточнить.");
      if (clarifications.indexOf("Какой результат должен получать пользователь?") === -1) {
        clarifications.push("Какой результат должен получать пользователь?");
      }
    }
    lines.push("");

    // 8. Регистрация, оплата, сохранение, AI
    lines.push("## 8. Регистрация, оплата, сохранение данных и AI");
    lines.push("");
    lines.push(
      featureLine(
        "Регистрация / вход",
        data.featAuth,
        clarifications,
        "Нужна ли регистрация или вход пользователя?",
        true
      )
    );
    lines.push(
      featureLine(
        "Оплата",
        data.featPay,
        clarifications,
        "Нужна ли оплата в первой версии?",
        true
      )
    );
    lines.push(
      featureLine(
        "Сохранение данных",
        data.featSave,
        clarifications,
        "Нужно ли сохранение данных между сессиями?",
        false
      )
    );
    lines.push(
      featureLine(
        "AI / нейросеть",
        data.featAi,
        clarifications,
        "Нужно ли подключение AI в первой версии?",
        true
      )
    );
    lines.push("");
    lines.push(
      "Неизвестные ответы («Пока не знаю») не являются принятыми решениями и требуют уточнения до реализации."
    );
    lines.push("");

    // 9. Дизайн и адаптивность
    lines.push("## 9. Дизайн и адаптивность");
    lines.push("");
    if (hasContent(data.designWish)) {
      lines.push("**Стиль, цвета и настроение:**");
      lines.push(asMultiline(data.designWish));
      lines.push("");
    } else {
      lines.push("**Стиль, цвета и настроение:** не указаны. Нужно уточнить.");
      clarifications.push("Какой стиль, цвета и настроение нужны продукту?");
      lines.push("");
    }
    if (hasContent(data.references)) {
      lines.push("**Референсы:**");
      lines.push(asMultiline(data.references));
      lines.push("");
    } else {
      lines.push("**Референсы:** не указаны.");
      lines.push("");
    }
    lines.push("**Где будут пользоваться:** " + data.device);
    lines.push("");

    // 10. Технологии и ограничения
    lines.push("## 10. Технологии и ограничения");
    lines.push("");
    if (hasContent(data.tech)) {
      lines.push("**Технологии / платформа (по словам заказчика):**");
      lines.push(asMultiline(data.tech));
    } else {
      lines.push(
        "Предложи подходящие технологии и объясни выбор перед реализацией."
      );
    }
    lines.push("");
    if (hasContent(data.constraints)) {
      lines.push("**Дополнительные ограничения и пожелания:**");
      lines.push(asMultiline(data.constraints));
    } else {
      lines.push("**Дополнительные ограничения и пожелания:** не указаны.");
    }
    lines.push("");
    lines.push(
      "Не предполагай, что продукт обязательно можно реализовать только на HTML, CSS и JavaScript — выбор стека зависит от требований."
    );
    lines.push("");

    // 11. Вне объёма
    Array.prototype.push.apply(
      lines,
      sectionOrClarify(
        "11. Что не входит в первую версию",
        data.outOfScope,
        "Что точно не нужно включать в первую версию?",
        clarifications
      )
    );

    // 12. Критерии приёмки
    lines.push("## 12. Критерии приёмки");
    lines.push("");
    if (hasContent(data.successSign)) {
      lines.push("**Как понять, что продукт работает:**");
      lines.push(asMultiline(data.successSign));
      lines.push("");
    } else {
      lines.push("**Как понять, что продукт работает:** не указано. Нужно уточнить.");
      clarifications.push("Как пользователь поймёт, что продукт работает?");
      lines.push("");
    }
    if (hasContent(data.mustWork)) {
      lines.push("**Обязательные успешные действия:**");
      lines.push(asMultiline(data.mustWork));
    } else {
      lines.push("**Обязательные успешные действия:** не указаны. Нужно уточнить.");
      clarifications.push(
        "Какие действия обязательно должны успешно выполняться при приёмке?"
      );
    }
    lines.push("");

    // 13. Вопросы
    lines.push("## 13. Вопросы, которые нужно уточнить");
    lines.push("");
    if (clarifications.length === 0) {
      lines.push("На основе заполненных ответов критичных пробелов не отмечено. При необходимости уточните детали реализации перед стартом.");
    } else {
      clarifications.forEach(function (q, index) {
        lines.push((index + 1) + ". " + q);
      });
    }
    lines.push("");

    // 14. Инструкция
    lines.push("## 14. Инструкция приложению для разработки");
    lines.push("");
    lines.push(
      "Сначала изучи требования. Если есть существенные неопределённости, задай уточняющие вопросы. Затем предложи план реализации первой версии. Не добавляй функции вне согласованного объёма. После реализации объясни, как запустить проект и проверить критерии приёмки. Не выполняй публикацию, commit или push без отдельной команды."
    );
    lines.push("");

    return lines.join("\n").replace(/\n{3,}/g, "\n\n");
  }

  function formHasData() {
    var textInputs = form.querySelectorAll(
      'input[type="text"], textarea:not(#result)'
    );
    for (var i = 0; i < textInputs.length; i += 1) {
      if (hasContent(textInputs[i].value)) {
        return true;
      }
    }
    if (getActions().length > 0) {
      return true;
    }
    if (hasContent(resultArea.value)) {
      return true;
    }
    return false;
  }

  function clearCopyStatus() {
    if (copyStatusTimer) {
      window.clearTimeout(copyStatusTimer);
      copyStatusTimer = null;
    }
    copyStatus.hidden = true;
    copyStatus.textContent = "";
    copyStatus.classList.remove("is-success", "is-manual");
  }

  function showCopyStatus(message, mode, autoHide) {
    copyStatus.hidden = false;
    copyStatus.textContent = message;
    copyStatus.classList.remove("is-success", "is-manual");
    if (mode) {
      copyStatus.classList.add(mode);
    }
    if (copyStatusTimer) {
      window.clearTimeout(copyStatusTimer);
      copyStatusTimer = null;
    }
    if (autoHide) {
      copyStatusTimer = window.setTimeout(function () {
        clearCopyStatus();
      }, 4000);
    }
  }

  function updateCopyButtonState() {
    copyBtn.disabled = !hasContent(resultArea.value);
    if (!hasContent(resultArea.value)) {
      clearCopyStatus();
    }
  }

  function selectResultText() {
    resultArea.focus();
    resultArea.select();
    resultArea.setSelectionRange(0, resultArea.value.length);
  }

  function copyWithExecCommand(text) {
    var previouslyReadOnly = resultArea.readOnly;
    resultArea.readOnly = false;
    selectResultText();
    var succeeded = false;
    try {
      succeeded = document.execCommand("copy");
    } catch (err) {
      succeeded = false;
    }
    resultArea.readOnly = previouslyReadOnly;
    return succeeded;
  }

  function showManualCopyInstruction() {
    selectResultText();
    showCopyStatus(
      "Автоматическое копирование недоступно. Текст выделен — нажмите Ctrl+C (на Mac: ⌘C), затем вставьте туда, где нужно.",
      "is-manual",
      false
    );
  }

  function copyResultText() {
    var text = resultArea.value;
    if (!hasContent(text)) {
      updateCopyButtonState();
      return;
    }

    clearCopyStatus();

    function onSuccess() {
      showCopyStatus("ТЗ скопировано", "is-success", true);
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(onSuccess).catch(function () {
        if (copyWithExecCommand(text)) {
          onSuccess();
        } else {
          showManualCopyInstruction();
        }
      });
      return;
    }

    if (copyWithExecCommand(text)) {
      onSuccess();
    } else {
      showManualCopyInstruction();
    }
  }

  function resetForm() {
    form.reset();
    clearAllErrors();
    actionsList.innerHTML = "";
    actionIdCounter = 0;
    createActionRow();
    resultArea.value = "";
    lastBuiltDocument = "";
    clearCopyStatus();
    updateCopyButtonState();

    form.querySelector('input[name="productType"][value="Сайт"]').checked = true;
    form.querySelector('input[name="device"][value="Компьютер и телефон"]').checked = true;
    ["featAuth", "featPay", "featSave", "featAi"].forEach(function (name) {
      form.querySelector('input[name="' + name + '"][value="Пока не знаю"]').checked = true;
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    var currentResult = resultArea.value;
    if (
      hasContent(currentResult) &&
      currentResult !== lastBuiltDocument
    ) {
      var replaceEdits = window.confirm(
        "В поле «Ваше ТЗ» есть ручные правки. При повторной сборке они будут заменены. Продолжить?"
      );
      if (!replaceEdits) {
        return;
      }
    } else if (
      hasContent(currentResult) &&
      currentResult === lastBuiltDocument
    ) {
      // повторная сборка без ручных правок — можно без диалога,
      // но предупредим кратко, если документ уже есть
      var rebuild = window.confirm(
        "Готовое ТЗ будет собрано заново и заменит текущий текст в поле результата. Продолжить?"
      );
      if (!rebuild) {
        return;
      }
    }

    var data = collectData();
    var documentText = buildDocument(data);
    resultArea.value = documentText;
    lastBuiltDocument = documentText;
    clearCopyStatus();
    updateCopyButtonState();

    if (window.matchMedia("(max-width: 899px)").matches) {
      resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    resultArea.focus();
  });

  copyBtn.addEventListener("click", function () {
    copyResultText();
  });

  resultArea.addEventListener("input", function () {
    updateCopyButtonState();
  });

  clearBtn.addEventListener("click", function () {
    if (formHasData()) {
      var confirmed = window.confirm(
        "Очистить все ответы и готовое ТЗ? Это действие нельзя отменить."
      );
      if (!confirmed) {
        return;
      }
    }
    resetForm();
    document.getElementById("product-idea").focus();
  });

  addActionBtn.addEventListener("click", function () {
    var input = createActionRow();
    input.focus();
  });

  form.querySelectorAll("input, textarea").forEach(function (el) {
    el.addEventListener("input", function () {
      var field = el.closest(".field");
      if (field && field.classList.contains("has-error")) {
        if (el.classList.contains("action-input")) {
          if (getActions().length > 0) {
            clearFieldError(field);
          }
        } else if (hasContent(el.value)) {
          clearFieldError(field);
        }
      }
    });
  });

  // Делегирование для динамических полей действий
  actionsList.addEventListener("input", function (event) {
    if (!event.target.classList.contains("action-input")) return;
    var field = form.querySelector("[data-actions-field]");
    if (field && field.classList.contains("has-error") && getActions().length > 0) {
      clearFieldError(field);
    }
  });

  createActionRow();
  updateCopyButtonState();
})();
