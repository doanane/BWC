from fastapi import HTTPException, status


def _nyi() -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Delivery service is not implemented yet",
    )


class DeliveryService:
    @staticmethod
    def create_delivery(*args, **kwargs):
        _nyi()

    @staticmethod
    def get_delivery_by_tracking(*args, **kwargs):
        _nyi()

    @staticmethod
    def assign_agent(*args, **kwargs):
        _nyi()

    @staticmethod
    def update_delivery_status(*args, **kwargs):
        _nyi()

    @staticmethod
    def get_agent_deliveries(*args, **kwargs):
        _nyi()
