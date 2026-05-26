let loadedCourses = [];

document.addEventListener("DOMContentLoaded", async function () {
    await checkLogin();
    await loadCourses();
    setupImageRecognition();
});

function getElement(id) {
    return document.getElementById(id);
}

function showOcrMessage(type, message) {
    const messageBox = getElement("ocrMessage");

    if (!messageBox) {
        return;
    }

    messageBox.innerHTML = "";

    if (!message) {
        return;
    }

    const alert = document.createElement("div");
    alert.className = `alert alert-${type} mb-0`;
    alert.textContent = message;
    messageBox.appendChild(alert);
}

function setOcrStatus(message) {
    const status = getElement("ocrStatus");

    if (status) {
        status.textContent = message;
    }
}

// Check whether user is logged in
async function checkLogin() {
    const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include"
    });

    const data = await response.json();

    if (!data.success) {
        window.location.href = "login.html";
        return;
    }

    getElement("userName").textContent = `Hello, ${data.user.name}`;
}

// Load courses into assignment course dropdown
async function loadCourses() {
    const response = await fetch("/api/courses", {
        method: "GET",
        credentials: "include"
    });

    const data = await response.json();

    const courseSelect = getElement("assignmentCourse");
    courseSelect.innerHTML = `<option value="">No Course</option>`;
    loadedCourses = [];

    if (data.success) {
        loadedCourses = data.courses;

        data.courses.forEach(function (course) {
            courseSelect.innerHTML += `
                <option value="${course.course_id}">
                    ${course.course_name}
                </option>
            `;
        });
    }
}

function setupImageRecognition() {
    const pasteZone = getElement("assignmentPasteZone");
    const fileInput = getElement("assignmentImageInput");

    if (!pasteZone || !fileInput) {
        return;
    }

    pasteZone.addEventListener("click", function () {
        pasteZone.focus();
    });

    pasteZone.addEventListener("paste", function (event) {
        const imageFile = getImageFromClipboard(event.clipboardData);

        if (imageFile) {
            event.preventDefault();
            recognizeAssignmentImage(imageFile);
        }
    });

    document.addEventListener("paste", function (event) {
        const activeElement = document.activeElement;
        const isTyping = activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);

        if (isTyping) {
            return;
        }

        const imageFile = getImageFromClipboard(event.clipboardData);

        if (imageFile) {
            event.preventDefault();
            recognizeAssignmentImage(imageFile);
        }
    });

    pasteZone.addEventListener("dragover", function (event) {
        event.preventDefault();
        pasteZone.classList.add("drag-over");
    });

    pasteZone.addEventListener("dragleave", function () {
        pasteZone.classList.remove("drag-over");
    });

    pasteZone.addEventListener("drop", function (event) {
        event.preventDefault();
        pasteZone.classList.remove("drag-over");

        const file = Array.from(event.dataTransfer.files).find(function (item) {
            return item.type.startsWith("image/");
        });

        if (file) {
            recognizeAssignmentImage(file);
        }
    });

    fileInput.addEventListener("change", function () {
        const file = fileInput.files[0];

        if (file) {
            recognizeAssignmentImage(file);
        }
    });
}

function getImageFromClipboard(clipboardData) {
    if (!clipboardData || !clipboardData.items) {
        return null;
    }

    const items = Array.from(clipboardData.items);
    const imageItem = items.find(function (item) {
        return item.type.startsWith("image/");
    });

    return imageItem ? imageItem.getAsFile() : null;
}

function showImagePreview(file) {
    const preview = getElement("ocrPreview");

    if (!preview) {
        return;
    }

    const imageUrl = URL.createObjectURL(file);
    preview.innerHTML = "";

    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "Pasted assignment screenshot preview";
    image.onload = function () {
        URL.revokeObjectURL(imageUrl);
    };

    preview.appendChild(image);
}

async function recognizeAssignmentImage(file) {
    showImagePreview(file);
    showOcrMessage("", "");

    if (!window.Tesseract) {
        showOcrMessage("danger", "Image recognition could not load. Please check your internet connection and try again.");
        setOcrStatus("OCR library unavailable.");
        return;
    }

    try {
        setOcrStatus("Reading image text...");

        const result = await Tesseract.recognize(file, "eng", {
            logger: function (message) {
                if (message.status === "recognizing text") {
                    const progress = Math.round(message.progress * 100);
                    setOcrStatus(`Reading image text... ${progress}%`);
                }
            }
        });

        const text = getAssignmentTextFromOcr(result.data);
        const textOutput = getElement("ocrTextOutput");

        if (textOutput) {
            textOutput.value = text;
            textOutput.classList.remove("d-none");
        }

        if (!text) {
            showOcrMessage("warning", "No readable text was found in the image.");
            setOcrStatus("No text found.");
            return;
        }

        const parsed = parseAssignmentText(text);
        const appliedFields = applyParsedAssignment(parsed);

        setOcrStatus("Image recognized.");

        if (appliedFields.length === 0) {
            showOcrMessage("warning", "Text was recognized, but no assignment fields could be inferred.");
            return;
        }

        showOcrMessage("success", `Auto-filled: ${appliedFields.join(", ")}.`);
    } catch (error) {
        console.error("OCR error:", error);
        setOcrStatus("Image recognition failed.");
        showOcrMessage("danger", "Could not recognize this image. Try a clearer screenshot or upload a different image.");
    }
}

function getAssignmentTextFromOcr(ocrData) {
    const layoutLines = getOcrLayoutLines(ocrData);

    if (layoutLines.length === 0) {
        return String(ocrData.text || "").trim();
    }

    const bounds = getOcrLayoutBounds(layoutLines);
    const filteredLines = layoutLines
        .filter(function (line) {
            return line.text && !isTopRightHeaderLine(line, bounds);
        })
        .sort(function (a, b) {
            if (Math.abs(a.y0 - b.y0) > 10) {
                return a.y0 - b.y0;
            }

            return a.x0 - b.x0;
        });

    const filteredText = filteredLines.map(function (line) {
        return line.text;
    }).join("\n").trim();

    return filteredText || String(ocrData.text || "").trim();
}

function getOcrLayoutLines(ocrData) {
    const rawLines = [];

    if (Array.isArray(ocrData.lines)) {
        rawLines.push(...ocrData.lines);
    }

    if (Array.isArray(ocrData.blocks)) {
        ocrData.blocks.forEach(function (block) {
            if (Array.isArray(block.paragraphs)) {
                block.paragraphs.forEach(function (paragraph) {
                    if (Array.isArray(paragraph.lines)) {
                        rawLines.push(...paragraph.lines);
                    }
                });
            }
        });
    }

    return rawLines
        .map(normalizeOcrLine)
        .filter(function (line, index, lines) {
            return line
                && line.text
                && lines.findIndex(function (candidate) {
                    return candidate
                        && candidate.text === line.text
                        && candidate.x0 === line.x0
                        && candidate.y0 === line.y0;
                }) === index;
        });
}

function normalizeOcrLine(line) {
    const text = cleanFieldValue(line.text || "");
    const bbox = line.bbox || line.boundingBox || {};
    const x0 = Number(bbox.x0 ?? bbox.left ?? line.x0 ?? line.left);
    const y0 = Number(bbox.y0 ?? bbox.top ?? line.y0 ?? line.top);
    const x1 = Number(bbox.x1 ?? bbox.right ?? line.x1 ?? (line.left + line.width));
    const y1 = Number(bbox.y1 ?? bbox.bottom ?? line.y1 ?? (line.top + line.height));

    if (!text || [x0, y0, x1, y1].some(Number.isNaN)) {
        return null;
    }

    return {
        text: text,
        x0: x0,
        y0: y0,
        x1: x1,
        y1: y1
    };
}

function getOcrLayoutBounds(lines) {
    return lines.reduce(function (bounds, line) {
        return {
            minX: Math.min(bounds.minX, line.x0),
            minY: Math.min(bounds.minY, line.y0),
            maxX: Math.max(bounds.maxX, line.x1),
            maxY: Math.max(bounds.maxY, line.y1)
        };
    }, {
        minX: Infinity,
        minY: Infinity,
        maxX: 0,
        maxY: 0
    });
}

function isTopRightHeaderLine(line, bounds) {
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const height = Math.max(bounds.maxY - bounds.minY, 1);
    const relativeX = (line.x0 - bounds.minX) / width;
    const relativeY = (line.y0 - bounds.minY) / height;

    return relativeX > 0.28 && relativeY < 0.24;
}

function parseAssignmentText(text) {
    const lines = text
        .split(/\r?\n/)
        .map(function (line) {
            return line.replace(/\s+/g, " ").trim();
        })
        .filter(Boolean);

    const fullText = lines.join("\n");
    const moodleAssignment = parseMoodleAssignment(lines);

    return {
        title: extractLabeledValue(lines, ["assignment", "assignment title", "title", "task", "homework"])
            || moodleAssignment.title
            || inferTitle(lines),
        course: extractLabeledValue(lines, ["course", "class", "subject"]),
        description: moodleAssignment.description || extractDescription(lines, fullText),
        dueDate: moodleAssignment.dueDate || extractDueDate(fullText),
        priority: extractPriority(fullText)
    };
}

function parseMoodleAssignment(lines) {
    const dueIndex = lines.findIndex(function (line) {
        return /^due\s*:/i.test(line);
    });

    if (dueIndex === -1) {
        return {
            title: "",
            description: "",
            dueDate: ""
        };
    }

    return {
        title: inferMoodleTitle(lines, dueIndex),
        description: inferMoodleDescription(lines, dueIndex),
        dueDate: parseMoodleDueDate(lines[dueIndex])
    };
}

function inferMoodleTitle(lines, dueIndex) {
    const titleParts = [];

    for (let index = 0; index < dueIndex; index += 1) {
        const line = lines[index];

        if (isMoodleMetaLine(line) || isLikelyBreadcrumbLine(line)) {
            if (titleParts.length > 0) {
                break;
            }

            continue;
        }

        titleParts.push(line);

        if (titleParts.join(" ").length > 80) {
            break;
        }
    }

    return cleanFieldValue(titleParts.join(" "));
}

function inferMoodleDescription(lines, dueIndex) {
    for (let index = dueIndex + 1; index < lines.length; index += 1) {
        const line = lines[index];

        if (isMoodleMetaLine(line) || isLikelyAttachmentLine(line)) {
            continue;
        }

        return cleanFieldValue(line);
    }

    return "";
}

function parseMoodleDueDate(line) {
    const match = line.match(/^due\s*:\s*(.+)$/i);

    if (!match) {
        return "";
    }

    return parseAbsoluteDate(match[1]);
}

function extractLabeledValue(lines, labels) {
    for (const line of lines) {
        for (const label of labels) {
            const pattern = new RegExp(`^${escapeRegExp(label)}\\s*[:\\-]\\s*(.+)$`, "i");
            const match = line.match(pattern);

            if (match && match[1]) {
                return cleanFieldValue(match[1]);
            }
        }
    }

    return "";
}

function inferTitle(lines) {
    const skipped = /^(course|class|subject|due|opened|deadline|priority|description|instructions?|mark as done)\b/i;
    const titleLine = lines.find(function (line) {
        return line.length >= 4
            && !skipped.test(line)
            && !isLikelyBreadcrumbLine(line)
            && !isLikelyAttachmentLine(line);
    });

    return titleLine ? cleanFieldValue(titleLine) : "";
}

function extractDescription(lines, fullText) {
    const labeled = extractLabeledValue(lines, ["description", "details", "instructions", "notes"]);
    const dueIndex = lines.findIndex(function (line) {
        return /^due\s*:/i.test(line);
    });

    if (labeled) {
        return labeled;
    }

    if (dueIndex !== -1) {
        const moodleDescription = inferMoodleDescription(lines, dueIndex);

        if (moodleDescription) {
            return moodleDescription;
        }
    }

    const descriptionLines = lines.filter(function (line) {
        return !/^(course|class|subject|assignment|assignment title|title|task|homework|opened|due|deadline|priority|mark as done)\b/i.test(line)
            && !isLikelyBreadcrumbLine(line)
            && !isLikelyAttachmentLine(line);
    });

    return descriptionLines.slice(1, 5).join("\n") || fullText.slice(0, 400);
}

function extractPriority(text) {
    const priorityMatch = text.match(/\b(priority|importance)\s*[:\-]?\s*(high|medium|low)\b/i);

    if (priorityMatch) {
        return normalizePriority(priorityMatch[2]);
    }

    const standaloneMatch = text.match(/\b(high|medium|low)\s+priority\b/i);

    if (standaloneMatch) {
        return normalizePriority(standaloneMatch[1]);
    }

    return "";
}

function normalizePriority(value) {
    const lowerValue = value.toLowerCase();

    if (lowerValue === "high") {
        return "High";
    }

    if (lowerValue === "low") {
        return "Low";
    }

    return "Medium";
}

function extractDueDate(text) {
    const candidates = [
        /\b(?:due date|due|deadline|submission deadline|submit by)\s*[:\-]?\s*((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\d{1,2}\s+[A-Za-z]+,?\s+\d{4},?\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i,
        /\b(?:due date|due|deadline|submission deadline|submit by)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]+,?\s+\d{4},?\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i,
        /\b(?:due date|due|deadline|submission deadline|submit by)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)?)/i,
        /\b(?:due date|due|deadline|submission deadline|submit by)\s*[:\-]?\s*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i,
        /\b(?:due date|due|deadline|submission deadline|submit by)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i,
        /\b(tomorrow|today)\s*(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)?/i,
        /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\b/i,
        /\b([A-Za-z]+\s+\d{1,2},?\s+\d{4}\s+\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\b/i
    ];

    for (const pattern of candidates) {
        const match = text.match(pattern);

        if (match) {
            const parsed = parseDateCandidate(match);

            if (parsed) {
                return parsed;
            }
        }
    }

    return "";
}

function parseDateCandidate(match) {
    const firstValue = match[1];
    const secondValue = match[2];

    if (/^(today|tomorrow)$/i.test(firstValue)) {
        return parseRelativeDate(firstValue, secondValue);
    }

    return parseAbsoluteDate(firstValue);
}

function parseRelativeDate(dayWord, timeText) {
    const date = new Date();

    if (/tomorrow/i.test(dayWord)) {
        date.setDate(date.getDate() + 1);
    }

    applyTimeToDate(date, timeText || "23:59");

    return formatForDateTimeLocal(date);
}

function parseAbsoluteDate(value) {
    const normalizedValue = value
        .replace(/\bat\b/gi, " ")
        .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+/i, "")
        .replace(/,/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    let date = parseNumericDate(normalizedValue)
        || parseDayMonthDate(normalizedValue)
        || new Date(normalizedValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    if (!/\d{1,2}:\d{2}|\b\d{1,2}\s*(AM|PM)\b/i.test(normalizedValue)) {
        date.setHours(23, 59, 0, 0);
    }

    return formatForDateTimeLocal(date);
}

function parseDayMonthDate(value) {
    const match = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(.+))?$/);

    if (!match) {
        return null;
    }

    const monthIndex = getMonthIndex(match[2]);

    if (monthIndex === -1) {
        return null;
    }

    const date = new Date(Number(match[3]), monthIndex, Number(match[1]), 23, 59, 0, 0);

    if (match[4]) {
        applyTimeToDate(date, match[4]);
    }

    return date;
}

function getMonthIndex(monthName) {
    const months = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december"
    ];
    const normalizedMonth = monthName.toLowerCase();

    return months.findIndex(function (month) {
        return month.startsWith(normalizedMonth.slice(0, 3));
    });
}

function parseNumericDate(value) {
    const match = value.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})(?:\s+(.+))?$/);

    if (!match) {
        return null;
    }

    let year;
    let month;
    let day;

    if (match[1].length === 4) {
        year = Number(match[1]);
        month = Number(match[2]) - 1;
        day = Number(match[3]);
    } else {
        month = Number(match[1]) - 1;
        day = Number(match[2]);
        year = Number(match[3]);

        if (year < 100) {
            year += 2000;
        }
    }

    const date = new Date(year, month, day, 23, 59, 0, 0);

    if (match[4]) {
        applyTimeToDate(date, match[4]);
    }

    return date;
}

function applyTimeToDate(date, timeText) {
    const match = String(timeText || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);

    if (!match) {
        date.setHours(23, 59, 0, 0);
        return;
    }

    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridiem = match[3] ? match[3].toUpperCase() : "";

    if (meridiem === "PM" && hour < 12) {
        hour += 12;
    }

    if (meridiem === "AM" && hour === 12) {
        hour = 0;
    }

    date.setHours(hour, minute, 0, 0);
}

function formatForDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function applyParsedAssignment(parsed) {
    const appliedFields = [];

    if (parsed.title) {
        getElement("assignmentTitle").value = parsed.title;
        appliedFields.push("title");
    }

    if (parsed.course && selectRecognizedCourse(parsed.course)) {
        appliedFields.push("course");
    }

    if (parsed.description) {
        getElement("assignmentDescription").value = parsed.description;
        appliedFields.push("description");
    }

    if (parsed.dueDate) {
        getElement("assignmentDueDate").value = parsed.dueDate;
        appliedFields.push("due date");
    }

    if (parsed.priority) {
        getElement("assignmentPriority").value = parsed.priority;
        appliedFields.push("priority");
    }

    return appliedFields;
}

function selectRecognizedCourse(courseText) {
    const normalizedCourseText = normalizeText(courseText);
    const matchedCourse = loadedCourses.find(function (course) {
        const normalizedCourseName = normalizeText(course.course_name);

        return normalizedCourseName.includes(normalizedCourseText)
            || normalizedCourseText.includes(normalizedCourseName);
    });

    if (!matchedCourse) {
        return false;
    }

    getElement("assignmentCourse").value = matchedCourse.course_id;
    return true;
}

function cleanFieldValue(value) {
    return String(value || "")
        .replace(/^[#*\-\s]+/, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function isMoodleMetaLine(line) {
    return /^(mark as done|opened\s*:|due\s*:)/i.test(line);
}

function isLikelyBreadcrumbLine(line) {
    return />|›|International School|Bachelor|DATA SCIENCE|114-\d|1142/i.test(line)
        || line.length > 120;
}

function isLikelyAttachmentLine(line) {
    return /\.(zip|pdf|docx?|pptx?|xlsx?|png|jpe?g)\b/i.test(line)
        || /^\d{1,2}\s+[A-Za-z]+\s+\d{4},?\s+\d{1,2}:\d{2}\s*(AM|PM)$/i.test(line);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function convertToMySQLDateTime(dateTimeLocalValue) {
    return dateTimeLocalValue.replace("T", " ") + ":00";
}

function isValidAssignmentForm(title, dueDateInput) {
    if (!title || !dueDateInput) {
        alert("Title and due date are required.");
        return false;
    }

    return true;
}

// Add assignment
const assignmentForm = getElement("assignmentForm");

assignmentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const courseId = getElement("assignmentCourse").value;
    const title = getElement("assignmentTitle").value.trim();
    const description = getElement("assignmentDescription").value.trim();
    const dueDateInput = getElement("assignmentDueDate").value;
    const priority = getElement("assignmentPriority").value;

    if (!isValidAssignmentForm(title, dueDateInput)) {
        return;
    }

    const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            course_id: courseId || null,
            title: title,
            description: description,
            due_date: convertToMySQLDateTime(dueDateInput),
            priority: priority
        })
    });

    const data = await response.json();

    if (data.success) {
        alert("Assignment added successfully.");
        window.location.href = "dashboard.html";
    } else {
        alert(data.message);
    }
});

// Logout
getElement("logoutBtn").addEventListener("click", async function () {
    const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
    });

    const data = await response.json();

    if (data.success) {
        window.location.href = "login.html";
    }
});
