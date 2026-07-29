import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone


def send_high_risk_alert(extracted_data: dict, raw_text: str = ""):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    alert_recipient = os.getenv("ALERT_RECIPIENT", "qa-alerts@aivoapharma.com")

    product_name = extracted_data.get("product_name", "Unspecified Product")
    batch_number = extracted_data.get("batch_number", "UNKNOWN")
    severity = extracted_data.get("severity_level", "Critical")
    risk = extracted_data.get("risk_classification", "High")
    capa = extracted_data.get("suggested_capa", "Immediate batch recall review, site audit, and 24-hour regulatory notification.")
    description = extracted_data.get("description", raw_text)

    print(f"[HIGH RISK ALERT TRIGGERED] Product: {product_name} | Batch: {batch_number} | Risk: {risk} | Severity: {severity}")

    if not smtp_user or not smtp_password:
        print("[SMTP NOTICE] SMTP_USER or SMTP_PASSWORD not set in environment. Simulated High-Risk email alert notification logged successfully.")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[URGENT CRITICAL ALERT] High-Risk Pharma Complaint - {product_name} ({batch_number})"
        msg["From"] = smtp_user
        msg["To"] = alert_recipient

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; background: #f8fafc; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }}
            .header {{ background: #dc2626; color: #ffffff; padding: 15px 20px; font-size: 18px; font-weight: bold; }}
            .content {{ padding: 20px; }}
            .badge {{ display: inline-block; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; }}
            .box {{ background: #f1f5f9; border-left: 4px solid #dc2626; padding: 12px; margin: 15px 0; border-radius: 0 4px 4px 0; }}
            .footer {{ background: #f1f5f9; padding: 12px 20px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              URGENT PHARMA REGULATORY ALERT
            </div>
            <div class="content">
              <p>A <strong>HIGH RISK / CRITICAL</strong> pharmaceutical customer complaint has been processed by the AI Complaint Agent.</p>
              
              <div>
                <span class="badge">HIGH RISK LEVEL</span>
                <span class="badge" style="background:#fef3c7; color:#d97706; border-color:#fde68a;">SEVERITY: {severity}</span>
              </div>

              <table style="width: 100%; margin-top: 15px; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">Product Name:</td><td>{product_name}</td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold;">Batch Number:</td><td><code>{batch_number}</code></td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold;">Complaint Type:</td><td>{extracted_data.get("complaint_type", "Quality")}</td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold;">Alert Timestamp:</td><td>{timestamp}</td></tr>
              </table>

              <div class="box">
                <strong>Recommended CAPA Action Plan:</strong><br/>
                {capa}
              </div>

              <p style="font-size: 13px; color: #475569;">
                <strong>Complaint Description Excerpt:</strong><br/>
                <em>{description[:400]}</em>
              </p>
            </div>
            <div class="footer">
              AIVOA Pharma Complaint Management System &bull; Automated Regulatory Notification Service
            </div>
          </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [alert_recipient], msg.as_string())

        print(f"[SMTP SUCCESS] High-risk alert email dispatched to {alert_recipient}.")
    except Exception as e:
        print(f"[SMTP ERROR] Failed to send email alert: {e}")
