class Legacy::XelementsController < Legacy::ApiController
  def index
    @slides = Slide.all
  end

  def show
    guid = params[:xelement_guid]
    xelement = (Slide.where(guid: guid).first ||
      Question.where(guid: guid).first ||
      Guide.where(guid: guid).first ||
      QuestionGroup.where(guid: guid).first
    )
    render json: xelement
  end

  def create
    render json: {}
  end
end
