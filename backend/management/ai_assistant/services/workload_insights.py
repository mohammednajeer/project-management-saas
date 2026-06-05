from analytics.workload import (
    compute_member_workload,
    get_organization_team_workload,
    get_thresholds,
)
from ai_assistant.providers.gemini_provider import (
    GeminiProviderError,
    compact_json,
    generate_text,
)


SYSTEM_INSTRUCTION = (
    "You are ProjectFlow's workload planning assistant. Use only the provided "
    "workload payload. Keep recommendations practical, fair, and scoped to the "
    "visible organization data."
)


def _recommendation(recommendation_type, severity, message, employee=None):
    return {
        "type": recommendation_type,
        "severity": severity,
        "message": message,
        "employee": employee,
    }


def _recommendations_for_member(row, personal=False):
    recommendations = []
    subject = "You have" if personal else f"{row['name']} has"

    if row["workload_status"] == "overloaded":
        recommendations.append(
            _recommendation(
                "rebalance_work",
                "high",
                (
                    f"{subject} a high active workload. Move lower-priority "
                    "work or add another assignee."
                ),
                None if personal else row,
            )
        )

    if row["overdue_tasks"]:
        recommendations.append(
            _recommendation(
                "address_overdue_work",
                "high",
                (
                    f"{subject} {row['overdue_tasks']} overdue task(s). "
                    "Review deadlines and unblock the oldest items first."
                ),
                None if personal else row,
            )
        )

    if row["workload_status"] == "underutilized":
        recommendations.append(
            _recommendation(
                "assign_more_work",
                "low",
                f"{subject} available capacity. Consider assigning upcoming tasks or review work.",
                None if personal else row,
            )
        )

    if row["open_issues"]:
        recommendations.append(
            _recommendation(
                "triage_issues",
                "medium",
                f"{subject} {row['open_issues']} open issue(s). Triage severity and owners.",
                None if personal else row,
            )
        )

    return recommendations


def generate_workload_insights(organization, user=None):
    personal = user is not None
    if personal:
        rows = [
            compute_member_workload(
                user,
                organization=organization,
            )
        ]
        scope = "self"
    else:
        rows = get_organization_team_workload(organization)
        scope = "organization"

    overloaded = [
        row
        for row in rows
        if row["workload_status"] == "overloaded"
    ]
    underutilized = [
        row
        for row in rows
        if row["workload_status"] == "underutilized"
    ]

    recommendations = []
    for row in rows:
        recommendations.extend(
            _recommendations_for_member(row, personal=personal)
        )

    if not recommendations:
        recommendations.append(
            _recommendation(
                "maintain_balance",
                "low",
                (
                    "Current workload distribution looks balanced. Keep "
                    "monitoring overdue tasks and open issues."
                ),
            )
        )

    payload = {
        "scope": scope,
        "thresholds": get_thresholds(),
        "summary": {
            "members": len(rows),
            "overloaded": len(overloaded),
            "underutilized": len(underutilized),
            "balanced": sum(
                1
                for row in rows
                if row["workload_status"] == "balanced"
            ),
        },
        "overloaded_employees": overloaded,
        "underutilized_employees": underutilized,
        "members": rows,
        "recommendations": recommendations,
    }

    prompt = (
        "Write a concise workload insight summary. Explain capacity concerns, "
        "who needs attention, and the best next actions. Do not mention people "
        "outside this payload.\n\n"
        f"Workload payload:\n{compact_json(payload)}"
    )
    try:
        payload["generated_summary"] = generate_text(
            prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            max_output_tokens=650,
        )
        payload["ai_provider"] = "gemini"
    except GeminiProviderError as e:
        payload["ai_provider"] = "fallback"
        payload["ai_error"] = str(e)

    return payload
