# app/routers/user.py
import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import config, security
from app.schemas.user import UserCreate, UserOut, Token
from app.crud import user as crud_user
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User as UserModel

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Users"]
)

@router.post(
    "/",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user with email and password"
)
def create_user_endpoint(user: UserCreate, db: Session = Depends(get_db)): # user enthält jetzt 'password'
    """Creates a new user account. Password will be hashed."""
    db_user = crud_user.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )
    # crud_user.create_user kümmert sich jetzt ums Hashing
    new_user = crud_user.create_user(db=db, user=user)
    # Gibt UserOut zurück (ohne Passwort-Hash)
    return new_user

@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current user details"
)
def read_users_me(current_user: UserModel = Depends(get_current_user)):
    """Retrieves the details for the currently authenticated user."""
    return current_user

@router.post("/login", response_model=Token, summary="Login for access token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), # Nimmt 'username' & 'password' aus Form Data
    db: Session = Depends(get_db)
):
    """
    Authenticates user with email and password, returns JWT access token.
    Expects form data with 'username' (used as email here) and 'password'.
    """
    # Verwende form_data.username als E-Mail für die Authentifizierung
    user = crud_user.authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Erstelle JWT
    access_token_expires = timedelta(minutes=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        # Wichtig: 'sub' sollte die User ID sein
        data={"sub": str(user.id)}, # ID als String speichern
        expires_delta=access_token_expires
    )
    # Gebe den Token zurück
    return {"access_token": access_token, "token_type": "bearer"}
