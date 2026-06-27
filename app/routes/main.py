from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_required, current_user
from app import db
from app.models.sms import SMDRange, SMSNumber, SMSCDR
from app.models.activity import News
from app.models.user import User
from datetime import datetime, timedelta
from sqlalchemy import func
import math

main_bp = Blueprint('main', __name__)

@main_bp.route('/agent/')
@main_bp.route('/agent/dashboard')
@login_required
def dashboard():
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    today_sms = SMSCDR.query.filter(
        SMSCDR.user_id == current_user.id,
        func.date(SMSCDR.created_at) == today
    ).count()

    week_sms = SMSCDR.query.filter(
        SMSCDR.user_id == current_user.id,
        SMSCDR.created_at >= week_ago
    ).count()

    month_sms = SMSCDR.query.filter(
        SMSCDR.user_id == current_user.id,
        SMSCDR.created_at >= month_ago
    ).count()

    first_of_month = today.replace(day=1)
    month_total = SMSCDR.query.filter(
        SMSCDR.user_id == current_user.id,
        SMSCDR.created_at >= first_of_month
    ).count()

    ranges_count = SMDRange.query.filter_by(is_active=True).count()
    numbers_count = SMSNumber.query.filter_by(agent_id=current_user.id).count()
    clients_count = User.query.filter_by(agent_id=current_user.id).count()
    news = News.query.filter_by(is_active=True).order_by(News.created_at.desc()).limit(5).all()
    recent_clients = User.query.filter_by(agent_id=current_user.id).order_by(User.created_at.desc()).limit(5).all()

    chart_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = SMSCDR.query.filter(
            SMSCDR.user_id == current_user.id,
            func.date(SMSCDR.created_at) == day
        ).count()
        chart_data.append({'date': day.strftime('%Y-%m-%d'), 'count': count})

    return render_template('main/dashboard.html',
        today_sms=today_sms,
        week_sms=week_sms,
        month_sms=month_sms,
        month_total=month_total,
        ranges_count=ranges_count,
        numbers_count=numbers_count,
        clients_count=clients_count,
        news=news,
        recent_clients=recent_clients,
        chart_data=chart_data
    )

@main_bp.route('/agent/SMSRanges')
@login_required
def sms_ranges():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    ranges_query = SMDRange.query.filter_by(is_active=True)
    search = request.args.get('search', '')
    if search:
        ranges_query = ranges_query.filter(
            db.or_(
                SMDRange.prefix.like(f'%{search}%'),
                SMDRange.country.like(f'%{search}%')
            )
        )
    ranges = ranges_query.order_by(SMDRange.country).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return render_template('main/sms_ranges.html', ranges=ranges)

@main_bp.route('/agent/MySMSNumbers')
@login_required
def my_sms_numbers():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    numbers_query = SMSNumber.query.filter_by(agent_id=current_user.id)
    range_filter = request.args.get('frange', '')
    if range_filter:
        numbers_query = numbers_query.filter_by(range_id=range_filter)
    client_filter = request.args.get('fclient', '')
    if client_filter:
        numbers_query = numbers_query.filter_by(client_id=client_filter)
    numbers = numbers_query.order_by(SMSNumber.number).paginate(
        page=page, per_page=per_page, error_out=False
    )
    ranges = SMDRange.query.filter_by(is_active=True).all()
    clients = User.query.filter_by(agent_id=current_user.id).all()
    return render_template('main/my_sms_numbers.html',
        numbers=numbers, ranges=ranges, clients=clients)

@main_bp.route('/agent/SMSCDRReports')
@login_required
def sms_cdr_reports():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    fdate1 = request.args.get('fdate1', datetime.utcnow().strftime('%Y-%m-%d'))
    fdate2 = request.args.get('fdate2', datetime.utcnow().strftime('%Y-%m-%d'))

    def parse_date(date_str):
        try:
            return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
        except (ValueError, TypeError):
            try:
                return datetime.strptime(date_str, '%Y-%m-%d')
            except (ValueError, TypeError):
                return datetime.utcnow()

    date1 = parse_date(fdate1)
    date2 = parse_date(fdate2)
    date2 = date2.replace(hour=23, minute=59, second=59)

    cdr_query = SMSCDR.query.filter(
        SMSCDR.user_id == current_user.id,
        SMSCDR.created_at >= date1,
        SMSCDR.created_at <= date2
    )

    frange = request.args.get('frange', '')
    if frange:
        cdr_query = cdr_query.filter_by(range_id=frange)
    fclient = request.args.get('fclient', '')
    if fclient:
        cdr_query = cdr_query.filter_by(client_id=fclient)
    fnum = request.args.get('fnum', '')
    if fnum:
        cdr_query = cdr_query.join(SMSNumber).filter(SMSNumber.number.like(f'%{fnum}%'))
    fcli = request.args.get('fcli', '')
    if fcli:
        cdr_query = cdr_query.filter(SMSCDR.cli.like(f'%{fcli}%'))

    cdr_records = cdr_query.order_by(SMSCDR.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    totals = db.session.query(
        func.sum(SMSCDR.agent_payout).label('total_payout'),
        func.sum(SMSCDR.client_payout).label('total_client'),
        func.sum(SMSCDR.profit).label('total_profit'),
        func.count(SMSCDR.id).label('total_sms')
    ).filter(
        SMSCDR.user_id == current_user.id,
        SMSCDR.created_at >= date1,
        SMSCDR.created_at <= date2
    ).first()

    ranges = SMDRange.query.filter_by(is_active=True).all()
    clients = User.query.filter_by(agent_id=current_user.id).all()

    return render_template('main/sms_cdr_reports.html',
        cdr_records=cdr_records, totals=totals,
        ranges=ranges, clients=clients,
        fdate1=fdate1, fdate2=fdate2)

@main_bp.route('/agent/Clients')
@login_required
def clients():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)
    clients_query = User.query.filter_by(agent_id=current_user.id)
    clients_list = clients_query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return render_template('main/clients.html', clients=clients_list)

@main_bp.route('/agent/Profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'change_password':
            current_password = request.form.get('current_password')
            new_password = request.form.get('new_password')
            confirm_password = request.form.get('confirm_password')

            if not current_user.check_password(current_password):
                flash('Current password is wrong!', 'danger')
            elif new_password != confirm_password:
                flash('New passwords do not match!', 'danger')
            elif len(new_password) < 6:
                flash('Password must be at least 6 characters!', 'danger')
            else:
                current_user.set_password(new_password)
                db.session.commit()
                flash('Password changed successfully!', 'success')
        else:
            current_user.name = request.form.get('name')
            current_user.company = request.form.get('company')
            current_user.email = request.form.get('email')
            current_user.skype = request.form.get('skype')
            current_user.contact = request.form.get('contact')
            current_user.country = request.form.get('country')
            current_user.address = request.form.get('address')
            db.session.commit()
            flash('Profile updated successfully.', 'success')

        return redirect(url_for('main.profile'))

    return render_template('main/profile.html')

@main_bp.route('/agent/MyActivity')
@login_required
def my_activity():
    from app.models.activity import ActivityLog
    page = request.args.get('page', 1, type=int)
    activities = ActivityLog.query.filter_by(user_id=current_user.id).order_by(
        ActivityLog.created_at.desc()
    ).paginate(page=page, per_page=50, error_out=False)
    return render_template('main/my_activity.html', activities=activities)

@main_bp.route('/agent/Notifications')
@login_required
def notifications():
    return render_template('main/notifications.html')