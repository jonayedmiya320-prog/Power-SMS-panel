from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash, Response
from flask_login import login_required, current_user
from app import db
from app.models.sms import SMDRange, SMSNumber, SMSCDR, AgentRangeLimit
from app.models.activity import News
from app.models.user import User, Role
from datetime import datetime, timedelta, date
from sqlalchemy import func
import csv
import io

main_bp = Blueprint('main', __name__)


@main_bp.route('/agent/')
@main_bp.route('/agent/dashboard')
@login_required
def dashboard():
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)

    today_sms = SMSCDR.query.filter(
        SMSCDR.user_id == current_user.id,
        func.date(SMSCDR.created_at) == today
    ).count()

    week_sms = SMSCDR.query.filter(
        SMSCDR.user_id == current_user.id,
        SMSCDR.created_at >= week_ago
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
    search = request.args.get('search', '')

    ranges_query = SMDRange.query.filter_by(is_active=True)
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

    # Agent limits for each range
    limits = {}
    if current_user.is_agent():
        for lim in AgentRangeLimit.query.filter_by(agent_id=current_user.id).all():
            limits[lim.range_id] = lim

    return render_template('main/sms_ranges.html', ranges=ranges, limits=limits)


@main_bp.route('/agent/TakeNumbers/<int:range_id>', methods=['POST'])
@login_required
def take_numbers(range_id):
    if not (current_user.is_agent() or current_user.is_admin()):
        flash('Access denied!', 'danger')
        return redirect(url_for('main.dashboard'))

    sms_range = SMDRange.query.get_or_404(range_id)
    count = request.form.get('count', 0, type=int)

    if count <= 0:
        flash('Please enter a valid number count!', 'danger')
        return redirect(url_for('main.sms_ranges'))

    # Check agent daily limit for this range
    limit = AgentRangeLimit.query.filter_by(
        agent_id=current_user.id,
        range_id=range_id
    ).first()

    if limit:
        today_taken = SMSNumber.query.filter(
            SMSNumber.agent_id == current_user.id,
            SMSNumber.range_id == range_id,
            func.date(SMSNumber.assigned_at) == date.today()
        ).count()

        total_taken = SMSNumber.query.filter_by(
            agent_id=current_user.id,
            range_id=range_id
        ).count()

        daily_remaining = limit.daily_limit - today_taken
        total_remaining = limit.total_limit - total_taken

        if daily_remaining <= 0:
            flash(f'Daily limit reached for {sms_range.country}! Limit: {limit.daily_limit}/day', 'danger')
            return redirect(url_for('main.sms_ranges'))

        if total_remaining <= 0:
            flash(f'Total limit reached for {sms_range.country}!', 'danger')
            return redirect(url_for('main.sms_ranges'))

        count = min(count, daily_remaining, total_remaining)

    # Get available numbers — duplicate protected
    available = SMSNumber.query.filter_by(
        range_id=range_id,
        agent_id=None,
        is_active=True
    ).limit(count).all()

    if not available:
        flash(f'No available numbers in {sms_range.country}!', 'warning')
        return redirect(url_for('main.sms_ranges'))

    taken = 0
    for num in available:
        num.agent_id = current_user.id
        num.status = 'reserved'
        num.assigned_at = datetime.utcnow()
        taken += 1

    db.session.commit()

    flash(f'{taken} numbers taken from {sms_range.country} successfully!', 'success')
    return redirect(url_for('main.my_sms_numbers'))


@main_bp.route('/agent/MySMSNumbers')
@login_required
def my_sms_numbers():
    per_page = request.args.get('per_page', 25, type=int)
    page = request.args.get('page', 1, type=int)
    range_filter = request.args.get('frange', '')
    client_filter = request.args.get('fclient', '')
    search = request.args.get('search', '')

    numbers_query = SMSNumber.query.filter_by(agent_id=current_user.id)

    if range_filter:
        numbers_query = numbers_query.filter_by(range_id=range_filter)
    if client_filter:
        numbers_query = numbers_query.filter_by(client_id=client_filter)
    if search:
        numbers_query = numbers_query.filter(SMSNumber.number.like(f'%{search}%'))

    numbers = numbers_query.order_by(SMSNumber.number).paginate(
        page=page, per_page=per_page, error_out=False
    )

    ranges = SMDRange.query.filter_by(is_active=True).all()
    clients = User.query.filter_by(agent_id=current_user.id).all()

    total_numbers = SMSNumber.query.filter_by(agent_id=current_user.id).count()
    assigned_count = SMSNumber.query.filter(
        SMSNumber.agent_id == current_user.id,
        SMSNumber.client_id.isnot(None)
    ).count()
    free_count = total_numbers - assigned_count

    return render_template('main/my_sms_numbers.html',
        numbers=numbers,
        ranges=ranges,
        clients=clients,
        total_numbers=total_numbers,
        assigned_count=assigned_count,
        free_count=free_count,
        per_page=per_page
    )


@main_bp.route('/agent/BulkAssign', methods=['POST'])
@login_required
def bulk_assign():
    if not (current_user.is_agent() or current_user.is_admin()):
        flash('Access denied!', 'danger')
        return redirect(url_for('main.dashboard'))

    number_ids = request.form.getlist('number_ids')
    client_id = request.form.get('client_id', type=int)
    client_payout = request.form.get('client_payout', 0.0, type=float)

    if not number_ids:
        flash('No numbers selected!', 'danger')
        return redirect(url_for('main.my_sms_numbers'))

    if not client_id:
        flash('Please select a client!', 'danger')
        return redirect(url_for('main.my_sms_numbers'))

    client = User.query.get(client_id)
    if not client or client.agent_id != current_user.id:
        flash('Invalid client!', 'danger')
        return redirect(url_for('main.my_sms_numbers'))

    assigned = 0
    for nid in number_ids:
        num = SMSNumber.query.get(int(nid))
        if num and num.agent_id == current_user.id:
            num.client_id = client_id
            num.client_payout = client_payout
            num.status = 'activated'
            num.assigned_at = datetime.utcnow()
            assigned += 1

    db.session.commit()
    flash(f'{assigned} numbers assigned to {client.username} at ${client_payout}/OTP!', 'success')
    return redirect(url_for('main.my_sms_numbers'))


@main_bp.route('/agent/BulkUnassign', methods=['POST'])
@login_required
def bulk_unassign():
    if not (current_user.is_agent() or current_user.is_admin()):
        flash('Access denied!', 'danger')
        return redirect(url_for('main.dashboard'))

    number_ids = request.form.getlist('number_ids')
    if not number_ids:
        flash('No numbers selected!', 'danger')
        return redirect(url_for('main.my_sms_numbers'))

    done = 0
    for nid in number_ids:
        num = SMSNumber.query.get(int(nid))
        if num and num.agent_id == current_user.id:
            num.client_id = None
            num.client_payout = 0.0
            num.status = 'reserved'
            done += 1

    db.session.commit()
    flash(f'{done} numbers unassigned from clients!', 'success')
    return redirect(url_for('main.my_sms_numbers'))


@main_bp.route('/agent/ReturnNumbers', methods=['POST'])
@login_required
def return_numbers():
    if not (current_user.is_agent() or current_user.is_admin()):
        flash('Access denied!', 'danger')
        return redirect(url_for('main.dashboard'))

    number_ids = request.form.getlist('number_ids')
    if not number_ids:
        flash('No numbers selected!', 'danger')
        return redirect(url_for('main.my_sms_numbers'))

    done = 0
    for nid in number_ids:
        num = SMSNumber.query.get(int(nid))
        if num and num.agent_id == current_user.id:
            num.agent_id = None
            num.client_id = None
            num.client_payout = 0.0
            num.agent_payout = 0.0
            num.status = 'available'
            num.assigned_at = None
            done += 1

    db.session.commit()
    flash(f'{done} numbers returned to range successfully!', 'success')
    return redirect(url_for('main.my_sms_numbers'))


@main_bp.route('/agent/DownloadNumbers', methods=['POST'])
@login_required
def download_numbers():
    number_ids = request.form.getlist('number_ids')

    if number_ids:
        numbers = SMSNumber.query.filter(
            SMSNumber.id.in_([int(x) for x in number_ids]),
            SMSNumber.agent_id == current_user.id
        ).all()
    else:
        numbers = SMSNumber.query.filter_by(agent_id=current_user.id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Number', 'Range', 'Client', 'Status', 'Client Payout', 'Assigned At'])

    for num in numbers:
        writer.writerow([
            num.number,
            f"{num.sms_range.prefix} - {num.sms_range.country}" if num.sms_range else '',
            num.client.username if num.client else 'Unassigned',
            num.status,
            num.client_payout,
            num.assigned_at.strftime('%Y-%m-%d %H:%M') if num.assigned_at else ''
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=numbers.csv'}
    )


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
    date2 = parse_date(fdate2).replace(hour=23, minute=59, second=59)

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

    cdr_records = cdr_query.order_by(SMSCDR.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    totals = db.session.query(
        func.sum(SMSCDR.agent_payout).label('total_payout'),
        func.sum(SMSCDR.client_payout).label('total_client'),
        func.count(SMSCDR.id).label('total_sms')
    ).filter(
        SMSCDR.user_id == current_user.id,
        SMSCDR.created_at >= date1,
        SMSCDR.created_at <= date2
    ).first()

    ranges = SMDRange.query.filter_by(is_active=True).all()
    clients = User.query.filter_by(agent_id=current_user.id).all()

    return render_template('main/sms_cdr_reports.html',
        cdr_records=cdr_records,
        totals=totals,
        ranges=ranges,
        clients=clients,
        fdate1=fdate1,
        fdate2=fdate2
    )


@main_bp.route('/agent/Clients')
@login_required
def clients():
    if current_user.is_client():
        flash('Access denied!', 'danger')
        return redirect(url_for('main.dashboard'))
    page = request.args.get('page', 1, type=int)
    clients_list = User.query.filter_by(agent_id=current_user.id).order_by(
        User.created_at.desc()
    ).paginate(page=page, per_page=25, error_out=False)
    return render_template('main/clients.html', clients=clients_list)


@main_bp.route('/agent/CreateClient', methods=['GET', 'POST'])
@login_required
def create_client():
    if current_user.is_client():
        flash('Access denied!', 'danger')
        return redirect(url_for('main.dashboard'))

    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        name = request.form.get('name')
        company = request.form.get('company')
        contact = request.form.get('contact')
        country = request.form.get('country')

        if User.query.filter_by(username=username).first():
            flash('Username already exists!', 'danger')
            return redirect(url_for('main.create_client'))

        if User.query.filter_by(email=email).first():
            flash('Email already exists!', 'danger')
            return redirect(url_for('main.create_client'))

        client_role = Role.query.filter_by(name='client').first()
        new_client = User(
            username=username,
            email=email,
            name=name,
            company=company,
            contact=contact,
            country=country,
            role=client_role,
            agent_id=current_user.id,
            is_active=True
        )
        new_client.set_password(password)
        db.session.add(new_client)
        db.session.commit()
        flash('Client created successfully!', 'success')
        return redirect(url_for('main.clients'))

    return render_template('main/create_client.html')


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