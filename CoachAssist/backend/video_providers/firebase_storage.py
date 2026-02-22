import firebase_admin
from firebase_admin import credentials, storage
import uuid
from datetime import timedelta
firebaseProjId = "coachassist-81c87"
# Initialize once
cred = credentials.Certificate("backend/firebase_key.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        "storageBucket": (firebaseProjId+".firebasestorage.app")
    })

bucket = storage.bucket()


def upload_video_to_firebase(file_obj, user_id: int, match_id: int):
    file_extension = file_obj.filename.split(".")[-1]
    #old unique name
    #unique_name = f"videos/{user_id}/{uuid.uuid4()}.{file_extension}"
    #new unique name with the match_id
    unique_name = f"videos/{user_id}/matches/{match_id}/{uuid.uuid4()}.{file_extension}"

    blob = bucket.blob(unique_name)

    file_obj.file.seek(0)

    blob.upload_from_file(
        file_obj.file,
        content_type=file_obj.content_type,
        timeout=120
    )

    signed_url = blob.generate_signed_url(
        expiration=timedelta(hours=2),
        method="GET"
    )

    return unique_name, signed_url

