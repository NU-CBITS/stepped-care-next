class Legacy::XelementsController < Legacy::ApiController
  def index
    render file: '/Users/ericcf/work/stepped-care/xelements.json'
  end

  def show
    render json: {}
  end

  def create
    render json: {}
  end
end
