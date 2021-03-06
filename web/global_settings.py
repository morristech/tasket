# -*- coding: utf-8 -*-
# Django settings for web project.
import os
PROJECT_PATH = os.path.abspath(os.path.dirname(__file__))
ROOT_PATH = os.path.split(PROJECT_PATH)[0]


# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'Europe/London'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-gb'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

# Absolute path to the directory that holds media.
# Example: "/home/media/media.lawrence.com/"
MEDIA_ROOT = ROOT_PATH + '/client/media/'

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash if there is a path component (optional in other cases).
# Examples: "http://media.lawrence.com", "http://example.com/media/"
MEDIA_URL = '/media/'

# URL prefix for admin media -- CSS, JavaScript and images. Make sure to use a
# trailing slash.
# Examples: "http://foo.com/media/", "/media/".
ADMIN_MEDIA_PREFIX = '/adminmedia/'

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'i50qg=vmpt3)9egf1an3sau)*zp!g6#bkufd0j9lgj9brse))%'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'utils.middleware.CORSAuthorizationMiddleware',
    # 'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'utils.middleware.CORSMiddleware'
)

ROOT_URLCONF = 'web.urls'

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    PROJECT_PATH + '/templates',
)

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    # Uncomment the next line to enable the admin:
    'django.contrib.admin',
    # Uncomment the next line to enable admin documentation:
    # 'django.contrib.admindocs',
    'tasks',
    'frontend',
    'sorl.thumbnail',
    'indexer',
    'paging',
    'sentry',
    'sentry.client',
    'south',
]

DEFAULT_TYPE = (
    'text/javascript',
    'application/javascript',
    'application/json',
    'text/html'
)

DEFAULT_HEADERS = (
    ('Access-Control-Allow-Origin', '*'),
    ('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, X-CSRFToken, Authorization, *'),
    ('Access-Control-Allow-Methods', 'POST, PUT, DELETE, GET, OPTIONS'),
    ('Access-Control-Allow-Credentials', 'true'),
)

CORS_PATHS = (
    ('/hubs/',  DEFAULT_TYPE , DEFAULT_HEADERS), 
    ('/tasks/', DEFAULT_TYPE , DEFAULT_HEADERS),
    ('/users/', DEFAULT_TYPE , DEFAULT_HEADERS),
    ('/login/', DEFAULT_TYPE , DEFAULT_HEADERS),
    ('/register/', DEFAULT_TYPE , DEFAULT_HEADERS),
)


THUMBNAIL_DUMMY = True
INTERNAL_IPS = ('127.0.0.1',)

EXPOSED_SETTINGS = ("TASK_ESTIMATE_MAX", "TASK_LIMIT", "CLAIMED_LIMIT", "USERS_CAN_CREATE_HUBS", "DONE_TIME_LIMIT", "CLAIMED_TIME_LIMIT", "AUTOVERIFY_TASKS_DONE_BY_OWNER")
