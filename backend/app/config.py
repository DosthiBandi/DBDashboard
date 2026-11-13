from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "sqlite:///./dbdashboard.db"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    dev_bearer_token: str = ""
    dev_user_id: str = ""
    dev_user_role: str = "owner"
    cors_origins: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
