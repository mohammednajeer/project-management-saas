import random
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings

def generate_otp():
    return f"{random.randint(100000, 999999)}"

def send_otp_email(user_email, otp, subject_type="verification", user_name="User"):
    if subject_type == "verification":
        subject = "Verify your ProjectFlow Email"
        message = (
            f"Hi {user_name},\n\n"
            f"Your 6-digit OTP to verify your email is:\n\n"
            f"{otp}\n\n"
            f"This OTP is valid for 10 minutes. If you did not request this, please ignore this email.\n\n"
            f"Thank you,\n"
            f"The ProjectFlow Team"
        )
    else:
        subject = "Reset your ProjectFlow Password"
        message = (
            f"Hi {user_name},\n\n"
            f"Your 6-digit OTP to reset your password is:\n\n"
            f"{otp}\n\n"
            f"This OTP is valid for 10 minutes. If you did not request this, please ignore this email.\n\n"
            f"Thank you,\n"
            f"The ProjectFlow Team"
        )

    # Print to logs so developers can see the OTP if SMTP is offline/unconfigured
    print(f"\n=== [OTP EMAIL LOG] ===")
    print(f"To: {user_email}")
    print(f"Subject: {subject}")
    print(f"OTP: {otp}")
    print(f"=======================\n")

    try:
        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [user_email],
            fail_silently=False,
        )
    except Exception as e:
        print(f"Error sending email via SMTP: {e}")
