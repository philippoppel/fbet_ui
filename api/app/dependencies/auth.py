# app/dependencies/auth.py
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer # Behalten wir für den Header-Check
from sqlalchemy.orm import Session
from app import security
from app.database import get_db
from app.crud import user as crud_user
from app.models.user import User as UserModel

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> UserModel:
    """Validiert den JWT und gibt den aktuellen User zurück."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}, # Wichtig für 401
    )

    payload = security.decode_access_token(token)
    if payload is None:
        logger.debug("Token decoding failed (invalid format, signature, or expired)")
        raise credentials_exception

    # Payload 'sub' enthält die User ID als String
    user_id_str: Optional[str] = payload.get("sub")
    if user_id_str is None:
        logger.error("Token payload missing 'sub' (user ID) claim")
        raise credentials_exception

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        logger.error(f"User ID ('sub' claim) in token is not a valid integer: {user_id_str}")
        raise credentials_exception

    user = crud_user.get_user(db, user_id=user_id)
    if user is None:
        logger.warning(f"User with ID {user_id} from valid token not found in DB.")
        raise credentials_exception

    if not user.is_active:
         logger.warning(f"Authentication attempt for inactive user ID {user_id}.")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    return user