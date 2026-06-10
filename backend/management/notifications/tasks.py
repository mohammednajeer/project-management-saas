from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.db import models
from django.db.models import Q
from django.core.mail import send_mail

from accounts.models import User
from organizations.models import Organization
from tasks.models import Task, SubTask
from projects.models import Project, ProjectMilestone
from company_calendar.models import CalendarEvent
from leave_management.models import LeaveRequest
from issues.models import Issue
from notifications.models import Notification
from activities.models import Activity


@shared_task
def check_deadlines_and_remind():
    today = timezone.localdate()
    
    # --- TASKS ---
    tasks = Task.objects.exclude(status="done").filter(due_date__isnull=False)
    for task in tasks:
        days_left = (task.due_date - today).days
        if days_left in [3, 1, 0]:
            users_to_notify = set(task.assigned_to.all())
            if task.project.project_lead:
                users_to_notify.add(task.project.project_lead)
            for manager in task.project.organization.users.filter(role="manager"):
                users_to_notify.add(manager)
            
            due_label = "today" if days_left == 0 else f"in {days_left} days"
            for user in users_to_notify:
                Notification.objects.create(
                    user=user,
                    title=f"Task Due {due_label.capitalize()}: {task.title}",
                    message=f"Task '{task.title}' is due {due_label} ({task.due_date}).",
                    type="task_reminder",
                    category="task"
                )
        elif days_left < 0 and not task.is_overdue:
            task.is_overdue = True
            task.save()
            users_to_notify = set(task.assigned_to.all())
            if task.project.project_lead:
                users_to_notify.add(task.project.project_lead)
            for manager in task.project.organization.users.filter(role="manager"):
                users_to_notify.add(manager)
            
            for user in users_to_notify:
                Notification.objects.create(
                    user=user,
                    title=f"Task Overdue: {task.title}",
                    message=f"Task '{task.title}' was due on {task.due_date} and is now overdue.",
                    type="task_overdue",
                    category="task"
                )

    # --- SUBTASKS ---
    subtasks = SubTask.objects.exclude(status="done").filter(due_date__isnull=False)
    for subtask in subtasks:
        days_left = (subtask.due_date - today).days
        if days_left in [1, 0]:
            users_to_notify = set(subtask.assigned_to.all())
            due_label = "today" if days_left == 0 else "tomorrow"
            for user in users_to_notify:
                Notification.objects.create(
                    user=user,
                    title=f"Subtask Due {due_label.capitalize()}: {subtask.title}",
                    message=f"Subtask '{subtask.title}' is due {due_label} ({subtask.due_date}).",
                    type="subtask_reminder",
                    category="task"
                )
                if days_left == 1:
                    try:
                        subject = f"Warning: Subtask '{subtask.title}' is due tomorrow!"
                        body = (
                            f"Hello {user.name or 'Team Member'},\n\n"
                            f"This is an automated warning reminder that your assigned subtask '{subtask.title}' "
                            f"(parent task: '{subtask.task.title}') is due tomorrow on {subtask.due_date}.\n\n"
                            f"Please ensure the subtask is completed or updated on your workspace board.\n\n"
                            f"Best regards,\n"
                            f"ProjectFlow System"
                        )
                        send_mail(
                            subject=subject,
                            message=body,
                            from_email="mohammednajeer785@gmail.com",
                            recipient_list=[user.email],
                            fail_silently=True
                        )
                    except Exception as email_err:
                        print(f"Failed to send subtask warning email to {user.email}: {email_err}")
        elif days_left < 0 and not subtask.is_overdue:
            subtask.is_overdue = True
            subtask.save()
            users_to_notify = set(subtask.assigned_to.all())
            for user in users_to_notify:
                Notification.objects.create(
                    user=user,
                    title=f"Subtask Overdue: {subtask.title}",
                    message=f"Subtask '{subtask.title}' was due on {subtask.due_date} and is now overdue.",
                    type="subtask_overdue",
                    category="task"
                )

    # --- PROJECTS ---
    projects = Project.objects.exclude(status="completed").filter(due_date__isnull=False)
    for project in projects:
        days_left = (project.due_date - today).days
        if days_left in [7, 3, 1]:
            users_to_notify = set()
            if project.project_lead:
                users_to_notify.add(project.project_lead)
            for manager in project.organization.users.filter(role="manager"):
                users_to_notify.add(manager)
            for admin in project.organization.users.filter(role="admin"):
                users_to_notify.add(admin)
                
            due_label = f"in {days_left} days"
            for user in users_to_notify:
                Notification.objects.create(
                    user=user,
                    title=f"Project Deadline Approaching: {project.name}",
                    message=f"Project '{project.name}' is due {due_label} ({project.due_date}).",
                    type="project_reminder",
                    category="project"
                )
        elif days_left < 0 and not project.is_overdue:
            project.is_overdue = True
            project.save()
            users_to_notify = set()
            if project.project_lead:
                users_to_notify.add(project.project_lead)
            for manager in project.organization.users.filter(role="manager"):
                users_to_notify.add(manager)
            for admin in project.organization.users.filter(role="admin"):
                users_to_notify.add(admin)
            
            for user in users_to_notify:
                Notification.objects.create(
                    user=user,
                    title=f"Project Overdue: {project.name}",
                    message=f"Project '{project.name}' missed its deadline on {project.due_date} and is now overdue.",
                    type="project_overdue",
                    category="project"
                )

    # --- MILESTONES ---
    milestones = ProjectMilestone.objects.exclude(status="completed")
    for milestone in milestones:
        days_left = (milestone.target_date - today).days
        if days_left in [7, 3, 1]:
            users_to_notify = set(milestone.project.members.all())
            if milestone.project.project_lead:
                users_to_notify.add(milestone.project.project_lead)
            for manager in milestone.project.organization.users.filter(role="manager"):
                users_to_notify.add(manager)
                
            due_label = f"in {days_left} days"
            for user in users_to_notify:
                Notification.objects.create(
                    user=user,
                    title=f"Milestone Target Approaching: {milestone.title}",
                    message=f"Milestone '{milestone.title}' is due {due_label} ({milestone.target_date}).",
                    type="milestone_reminder",
                    category="milestone"
                )
        elif days_left < 0 and not milestone.is_overdue:
            milestone.is_overdue = True
            milestone.save()
            users_to_notify = set(milestone.project.members.all())
            if milestone.project.project_lead:
                users_to_notify.add(milestone.project.project_lead)
            for manager in milestone.project.organization.users.filter(role="manager"):
                users_to_notify.add(manager)
            
            for user in users_to_notify:
                Notification.objects.create(
                    user=user,
                    title=f"Milestone Overdue: {milestone.title}",
                    message=f"Milestone '{milestone.title}' missed its target date on {milestone.target_date} and is now overdue.",
                    type="milestone_overdue",
                    category="milestone"
                )


@shared_task
def send_daily_digest():
    today = timezone.localdate()
    active_users = User.objects.filter(is_active=True, organization__isnull=False)
    
    for user in active_users:
        # Today's Tasks
        tasks_today = Task.objects.filter(assigned_to=user, due_date=today).exclude(status="done")
        
        # Overdue Work
        overdue_tasks = Task.objects.filter(assigned_to=user, due_date__lt=today).exclude(status="done")
        overdue_subtasks = SubTask.objects.filter(assigned_to=user, due_date__lt=today).exclude(status="done")
        overdue_count = overdue_tasks.count() + overdue_subtasks.count()
        
        # Upcoming Deadlines (next 3 days, not today)
        upcoming_tasks = Task.objects.filter(
            assigned_to=user,
            due_date__gt=today,
            due_date__lte=today + timedelta(days=3)
        ).exclude(status="done")
        
        # Upcoming Events
        events_today = CalendarEvent.objects.filter(
            organization=user.organization,
            start_date=today
        ).filter(Q(visibility="organization") | Q(created_by=user))
        
        # Send digest if there is anything to report
        if tasks_today.exists() or overdue_count > 0 or upcoming_tasks.exists() or events_today.exists():
            lines = ["Here is your daily ProjectFlow digest:\n"]
            
            if tasks_today.exists():
                lines.append(f"📅 Today's Tasks: {tasks_today.count()} due today")
                for t in tasks_today:
                    lines.append(f"  - {t.title} ({t.project.name})")
            
            if overdue_count > 0:
                lines.append(f"⚠️ Overdue Work: {overdue_count} items are overdue")
                for t in overdue_tasks[:3]:
                    lines.append(f"  - Task: {t.title} (due {t.due_date})")
                for st in overdue_subtasks[:3]:
                    lines.append(f"  - Subtask: {st.title} (due {st.due_date})")
            
            if upcoming_tasks.exists():
                lines.append(f"⏳ Upcoming Deadlines: {upcoming_tasks.count()} tasks due in the next 3 days")
                for t in upcoming_tasks:
                    lines.append(f"  - {t.title} (due {t.due_date})")
            
            if events_today.exists():
                lines.append(f"🎉 Today's Events: {events_today.count()} events scheduled today")
                for e in events_today:
                    lines.append(f"  - {e.title}")
            
            Notification.objects.create(
                user=user,
                title="Daily Digest Summary",
                message="\n".join(lines),
                type="daily_digest",
                category="system"
            )


@shared_task
def send_weekly_summary():
    today = timezone.localdate()
    start_date = timezone.now() - timedelta(days=7)
    
    organizations = Organization.objects.all()
    for org in organizations:
        managers_and_admins = org.users.filter(role__in=["admin", "manager"])
        if not managers_and_admins.exists():
            continue
            
        # Completed Tasks count (using activity log or current status)
        completed_tasks_count = Activity.objects.filter(
            organization=org,
            action="task_updated",
            message__icontains="to done",
            created_at__gte=start_date
        ).values("task").distinct().count()
        
        # Created Tasks
        created_tasks_count = Task.objects.filter(
            project__organization=org,
            created_at__gte=start_date
        ).count()
        
        # Resolved Issues
        resolved_issues_count = Issue.objects.filter(
            project__organization=org,
            status="resolved",
            updated_at__gte=start_date
        ).count()
        
        # Leave Statistics
        leave_new = LeaveRequest.objects.filter(
            organization=org,
            created_at__gte=start_date
        ).count()
        leave_approved = LeaveRequest.objects.filter(
            organization=org,
            status="approved",
            approved_at__gte=start_date
        ).count()
        
        # Upcoming Milestones (next 7 days)
        upcoming_milestones = ProjectMilestone.objects.filter(
            project__organization=org,
            target_date__gte=today,
            target_date__lte=today + timedelta(days=7)
        ).exclude(status="completed")
        
        # Project Health Summary
        active_projects = Project.objects.filter(organization=org).exclude(status__in=["completed", "archived"])
        healthy_count = active_projects.filter(health="healthy").count()
        attention_count = active_projects.filter(health="attention").count()
        at_risk_count = active_projects.filter(health="at_risk").count()
        
        # Build weekly summary report
        lines = [f"Weekly Performance Report for {org.name}:\n"]
        lines.append(f"📊 Tasks Completed: {completed_tasks_count}")
        lines.append(f"➕ Tasks Created: {created_tasks_count}")
        lines.append(f"🔧 Issues Resolved: {resolved_issues_count}")
        lines.append(f"✈️ Leave Requests: {leave_new} requested, {leave_approved} approved")
        
        if upcoming_milestones.exists():
            lines.append(f"\n🚩 Upcoming Milestones (Next 7 Days):")
            for m in upcoming_milestones:
                lines.append(f"  - {m.title} (due {m.target_date}) in {m.project.name}")
        else:
            lines.append(f"\n🚩 Upcoming Milestones: None scheduled")
            
        lines.append(f"\n📁 Active Project Health Summary:")
        lines.append(f"  - Healthy: {healthy_count}")
        lines.append(f"  - Attention Required: {attention_count}")
        lines.append(f"  - At Risk: {at_risk_count}")
        
        message = "\n".join(lines)
        
        for user in managers_and_admins:
            Notification.objects.create(
                user=user,
                title="Weekly Summary Report",
                message=message,
                type="weekly_summary",
                category="system"
            )
