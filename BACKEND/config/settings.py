# settings.py
import os
from pathlib import Path
# from decouple import config # Comentado
from decouple import Config, RepositoryEnv # Importa clases específicas
import cloudinary
import stripe
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent # Esto apunta a la carpeta BACKEND

# --- CARGA EXPLÍCITA DEL .env ---
# Busca el archivo .env en la carpeta BASE_DIR (BACKEND)
DOTENV_FILE = BASE_DIR / '.env'
env_config = Config(RepositoryEnv(DOTENV_FILE))
# Usa env_config en lugar de config de ahora en adelante
# ----------------------------------


# Quick-start development settings - unsuitable for production
SECRET_KEY = env_config('SECRET_KEY') # Lee desde .env

# --- PRUEBA DEFINITIVA ---
# Comenta la línea que lee desde env_config
# DEBUG = env_config('DEBUG', default=False, cast=bool)
# Establece DEBUG directamente en True
DEBUG = env_config('DEBUG', default=False, cast=bool)
print(f"--- ¡¡¡ATENCIÓN!!! DEBUG está FORZADO a: {DEBUG} ---") # Mensaje para recordar
# -------------------------

ALLOWED_HOSTS_STRING = env_config('DJANGO_ALLOWED_HOSTS', default='127.0.0.1,localhost') # Lee desde .env
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_STRING.split(',') if host.strip()]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    #'whitenoise.runserver_nostatic', # Mantenlo comentado localmente
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'usuario',
    'corsheaders',
    'ventas',
    'reportes',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # Para producción
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware', # Antes de CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'config/template')], # Verifica esta ruta
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application' # Verifica el nombre 'config'


# Database
DATABASE_URL = env_config('DATABASE_URL', default='sqlite:///db.sqlite3') # Añade un default por si acaso
DATABASES = {
    # Lee desde DATABASE_URL usando dj-database-url
    'default': dj_database_url.config(default=DATABASE_URL, conn_max_age=600, ssl_require=False)
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]


# Internationalization
LANGUAGE_CODE = 'es-es' # Español
TIME_ZONE = 'America/La_Paz' # Bolivia
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles' # Para collectstatic en producción
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage' # Para Whitenoise

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'usuario.Usuario'

# REST_FRAMEWORK
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.TokenAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    )
}

# CORS
CORS_ALLOWED_ORIGINS_STRING = env_config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS_STRING.split(',') if origin.strip()]
# Asegúrate de que no haya otra definición de ALLOWED_HOSTS aquí abajo

# EMAIL
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'no-reply@smartsales365.com'
PASSWORD_RESET_TEMPLATE = 'registration/password_reset_email.html'

# CLOUDINARY
cloudinary.config(
  cloud_name = env_config('CLOUDINARY_CLOUD_NAME'),
  api_key = env_config('CLOUDINARY_API_KEY'),
  api_secret = env_config('CLOUDINARY_API_SECRET'),
  secure = True
)

# STRIPE
STRIPE_SECRET_KEY = env_config('STRIPE_SECRET_KEY')
stripe.api_key = STRIPE_SECRET_KEY

# GEMINI
GEMINI_API_KEY = env_config('GEMINI_API_KEY', default=None)
if not GEMINI_API_KEY:
    print("ADVERTENCIA: GEMINI_API_KEY no encontrada en .env. La IA no funcionará.")