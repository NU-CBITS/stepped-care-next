class Legacy::AppEventsController < Legacy::ApiController
  def create
    @app_event = AppEvent.new(event_params)

    if @app_event.save
      render 'create', status: 201
    else
      render json: { status: 'error' }, status: 400
    end
  end

  private

  def event_params
    {
      user_guid: params[:user_guid],
      page: params[:values][2],
      action: params[:values][1]
    }
  end
end
