import datetime
import logging

from fastapi import Request, HTTPException
from fastapi import APIRouter
# from utils.processing import convertBase64ToImage, convertImageToBase64, cropImage
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/process", tags=["process"])  # pyright: ignore[reportUndefinedVariable]

class CropRequest(BaseModel):
    imageBase64: str
    cropW: int
    cropH: int
    cropX: int
    cropY: int

@router.post("/crop-image")
async def crop_image(req: CropRequest, request: Request):
    """
    Crop image to given width, height, x, y.
    """
    try:
        transid = request.headers.get("transId", datetime.datetime.now().strftime("%Y%m%d%H%M%S"))
        logger.info(f"[{transid}] - Cropping image with width: {req.cropW}, height: {req.cropH}, x: {req.cropX}, y: {req.cropY}")
        image = convertBase64ToImage(req.imageBase64)
        image_cropped = cropImage(image, req.cropW, req.cropH, req.cropX, req.cropY)
        image_cropped_base64 = convertImageToBase64(image_cropped)
        logger.info(f"[{transid}] - Cropped image successfully")
        return {
            "transId": transid,
            "imageCroppedBase64": image_cropped_base64
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cropping image: {e}")