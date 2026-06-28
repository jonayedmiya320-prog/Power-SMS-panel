from app import db
from datetime import datetime


class Wallet(db.Model):
    __tablename__ = 'wallets'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    balance = db.Column(db.Float, default=0.0)
    total_earned = db.Column(db.Float, default=0.0)
    total_withdrawn = db.Column(db.Float, default=0.0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('wallet', uselist=False))

    def __repr__(self):
        return f'<Wallet user_id={self.user_id} balance={self.balance}>'

    @staticmethod
    def get_or_create(user_id):
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            wallet = Wallet(user_id=user_id, balance=0.0)
            db.session.add(wallet)
            db.session.commit()
        return wallet

    def add_balance(self, amount):
        self.balance += amount
        self.total_earned += amount
        self.updated_at = datetime.utcnow()

    def deduct_balance(self, amount):
        if self.balance >= amount:
            self.balance -= amount
            self.total_withdrawn += amount
            self.updated_at = datetime.utcnow()
            return True
        return False


class WithdrawalRequest(db.Model):
    __tablename__ = 'withdrawal_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String(50))
    account_details = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')
    admin_note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime)

    user = db.relationship('User', backref='withdrawal_requests')

    def __repr__(self):
        return f'<WithdrawalRequest user_id={self.user_id} amount={self.amount} status={self.status}>'