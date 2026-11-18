from pathlib import Path
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "sqlite:///./dbdashboard.db"
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_anon_key: str = ""
    dev_bearer_token: str = ""
    dev_user_id: str = ""
    dev_user_role: str = "owner"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / ".env", extra="ignore")

    @model_validator(mode="after")
    def validate_connection_settings(self):
        if self.database_url.startswith(("postgres://", "postgresql://")):
            self.database_url = "postgresql+psycopg://" + self.database_url.split("://", 1)[1]
        if self.supabase_url and not self.supabase_url.startswith("https://"):
            raise ValueError("SUPABASE_URL must be the project HTTPS URL, not a database connection string")
        if self.supabase_publishable_key and not self.supabase_publishable_key.startswith("sb_publishable_"):
            raise ValueError("SUPABASE_PUBLISHABLE_KEY must be a publishable key")
        return self

settings = Settings()
