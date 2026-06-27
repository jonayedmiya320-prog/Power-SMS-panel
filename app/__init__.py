from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from config import config

db = SQLAlchemy()
login_manager = LoginManager()
bcrypt = Bcrypt()

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    db.init_app(app)
    login_manager.init_app(app)
    bcrypt.init_app(app)
    CORS(app)

    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please login to continue.'
    login_manager.login_message_category = 'warning'

    from app.models.user import User
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from app.routes.auth import auth_bp
    from app.routes.main import main_bp
    from app.routes.admin import admin_bp
    from app.routes.developer import dev_bp
    from app.routes.sms_monitor import monitor_bp
    from app.routes.provider import provider_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(dev_bp)
    app.register_blueprint(monitor_bp)
    app.register_blueprint(provider_bp)

    with app.app_context():
        db.create_all()
        from app.fetcher import start_all_providers
        start_all_providers(app)

    return app