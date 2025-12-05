from pydantic import BaseModel, EmailStr

#Data for signing up
class SignupSchema(BaseModel):
    username: str
    email: EmailStr 
    password: str
    full_name: str 

#Data for logging in
class LoginSchema(BaseModel):
    username: str #username or email
    password: str

#Data for editing profile
class ProfileUpdateSchema(BaseModel):
    username: str | None= None
    email: EmailStr | None= None
    password: str | None= None
    full_name: str | None= None