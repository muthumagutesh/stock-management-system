from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """Provides a consistent, enterprise-grade JSON error response structure."""
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            'success': False,
            'status_code': response.status_code,
            'error': {
                'type': exc.__class__.__name__,
                'message': str(exc) if not hasattr(exc, 'detail') else exc.detail,
            }
        }
        response.data = custom_data
    else:
        logger.error(f"Unhandled exception: {exc}", exc_info=context.get('request'))
        response = Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'error': {
                'type': 'InternalServerError',
                'message': 'An unexpected server error occurred. Please contact the administrator.'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response
