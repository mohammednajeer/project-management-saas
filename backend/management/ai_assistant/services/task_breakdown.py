import re

from ai_assistant.providers.gemini_provider import GeminiProviderError, generate_json


PRIORITY_KEYWORDS = {
    "critical": ("urgent", "critical", "blocker", "production", "security"),
    "high": ("deadline", "launch", "payment", "auth", "approval", "risk"),
    "medium": ("dashboard", "report", "workflow", "integration", "api"),
}


TEMPLATE_RULES = [
    {
        "keywords": ("api", "endpoint", "backend", "server"),
        "task": "Implement backend API",
        "subtasks": [
            "Define request and response contract",
            "Add service-layer validation",
            "Create endpoint and route",
            "Verify permission and error handling",
        ],
        "priority": "high",
    },
    {
        "keywords": ("ui", "frontend", "page", "screen", "component"),
        "task": "Build user interface",
        "subtasks": [
            "Create reusable view components",
            "Wire API calls and loading states",
            "Handle empty, error, and success states",
            "Check responsive layout",
        ],
        "priority": "medium",
    },
    {
        "keywords": ("database", "model", "schema", "migration"),
        "task": "Update data model",
        "subtasks": [
            "Identify required fields and relationships",
            "Add migration-safe model changes",
            "Backfill or default existing data if needed",
            "Validate admin and serializer behavior",
        ],
        "priority": "high",
    },
    {
        "keywords": ("notification", "email", "reminder", "alert"),
        "task": "Add notification flow",
        "subtasks": [
            "Define trigger conditions",
            "Create notification payload",
            "Route delivery to target users",
            "Test duplicate and retry behavior",
        ],
        "priority": "medium",
    },
    {
        "keywords": ("test", "qa", "quality", "bug"),
        "task": "Add quality checks",
        "subtasks": [
            "Cover primary success path",
            "Cover permission and validation failures",
            "Check edge cases with empty data",
            "Run regression checks",
        ],
        "priority": "medium",
    },
]

DEFAULT_TASKS = [
    {
        "title": "Clarify requirements",
        "subtasks": [
            "Confirm goal and expected outcome",
            "Identify actors, permissions, and constraints",
            "List required input and output data",
        ],
        "priority": "medium",
    },
    {
        "title": "Design implementation approach",
        "subtasks": [
            "Map impacted modules",
            "Choose data flow and validation rules",
            "Define success and failure responses",
        ],
        "priority": "medium",
    },
    {
        "title": "Implement core workflow",
        "subtasks": [
            "Add service logic",
            "Connect API or UI entry points",
            "Handle errors and empty states",
        ],
        "priority": "high",
    },
    {
        "title": "Verify and polish",
        "subtasks": [
            "Run automated checks",
            "Test realistic data",
            "Document usage notes",
        ],
        "priority": "medium",
    },
]

SYSTEM_INSTRUCTION = (
    "You are ProjectFlow's task planning assistant. Return only valid JSON. "
    "Create practical implementation tasks with short subtasks and priorities."
)


def _normalize_text(*parts):
    return " ".join(part or "" for part in parts).lower()


def _infer_priority(text, fallback="medium"):
    for priority, keywords in PRIORITY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return priority
    return fallback


def _extract_action_items(description):
    if not description:
        return []

    lines = [
        re.sub(r"^[-*#\d.)\s]+", "", line).strip()
        for line in description.splitlines()
    ]
    return [
        line
        for line in lines
        if len(line.split()) >= 3
    ][:5]


def _task(title, subtasks, priority):
    return {
        "title": title,
        "priority": priority,
        "subtasks": [
            {
                "title": subtask,
                "priority": priority if index == 0 else "medium",
            }
            for index, subtask in enumerate(subtasks)
        ],
    }


def _rule_based_task_breakdown(title, description=""):
    source_text = _normalize_text(title, description)
    base_priority = _infer_priority(source_text)
    tasks = []
    seen_titles = set()

    for rule in TEMPLATE_RULES:
        if any(keyword in source_text for keyword in rule["keywords"]):
            task_title = rule["task"]
            if task_title in seen_titles:
                continue
            seen_titles.add(task_title)
            tasks.append(
                _task(
                    task_title,
                    rule["subtasks"],
                    _infer_priority(source_text, rule["priority"]),
                )
            )

    action_items = _extract_action_items(description)
    for action_item in action_items:
        task_title = action_item[:1].upper() + action_item[1:]
        if task_title in seen_titles:
            continue
        seen_titles.add(task_title)
        tasks.append(
            _task(
                task_title,
                [
                    "Define acceptance criteria",
                    "Implement the required change",
                    "Review and verify outcome",
                ],
                base_priority,
            )
        )

    if not tasks:
        tasks = [
            _task(
                item["title"],
                item["subtasks"],
                _infer_priority(source_text, item["priority"]),
            )
            for item in DEFAULT_TASKS
        ]

    return {
        "source": {
            "title": title,
            "description": description,
        },
        "method": "rule_based_v1",
        "tasks": tasks[:6],
    }


def _valid_priority(priority):
    return priority in {"critical", "high", "medium", "low"}


def _normalize_gemini_breakdown(title, description, payload):
    tasks = payload.get("tasks") if isinstance(payload, dict) else None
    if not isinstance(tasks, list) or not tasks:
        raise GeminiProviderError("Gemini returned no tasks.")

    normalized_tasks = []
    for item in tasks[:6]:
        if not isinstance(item, dict):
            continue
        task_title = str(item.get("title") or "").strip()
        priority = str(item.get("priority") or "medium").lower()
        subtasks = item.get("subtasks") or []
        if not task_title or not isinstance(subtasks, list):
            continue
        if not _valid_priority(priority):
            priority = "medium"

        normalized_subtasks = []
        for subtask in subtasks[:6]:
            if isinstance(subtask, dict):
                subtask_title = str(subtask.get("title") or "").strip()
                subtask_priority = str(subtask.get("priority") or "medium").lower()
            else:
                subtask_title = str(subtask or "").strip()
                subtask_priority = "medium"
            if not subtask_title:
                continue
            if not _valid_priority(subtask_priority):
                subtask_priority = "medium"
            normalized_subtasks.append(
                {
                    "title": subtask_title,
                    "priority": subtask_priority,
                }
            )

        if normalized_subtasks:
            normalized_tasks.append(
                {
                    "title": task_title,
                    "priority": priority,
                    "subtasks": normalized_subtasks,
                }
            )

    if not normalized_tasks:
        raise GeminiProviderError("Gemini returned invalid tasks.")

    return {
        "source": {
            "title": title,
            "description": description,
        },
        "method": "gemini",
        "ai_provider": "gemini",
        "tasks": normalized_tasks,
    }


def _gemini_task_breakdown(title, description=""):
    prompt = (
        "Break this work request into JSON with this exact shape: "
        '{"tasks":[{"title":"Task name","priority":"high|medium|low|critical",'
        '"subtasks":[{"title":"Subtask name","priority":"high|medium|low|critical"}]}]}. '
        "Return 3 to 6 tasks and 2 to 5 subtasks per task.\n\n"
        f"Title: {title}\nDescription: {description or 'No description provided.'}"
    )
    payload = generate_json(
        prompt,
        system_instruction=SYSTEM_INSTRUCTION,
        max_output_tokens=1400,
    )
    return _normalize_gemini_breakdown(title, description, payload)


def generate_task_breakdown(title, description=""):
    try:
        return _gemini_task_breakdown(title, description)
    except GeminiProviderError as e:
        payload = _rule_based_task_breakdown(title, description)
        payload["ai_provider"] = "fallback"
        payload["ai_error"] = str(e)
        return payload
