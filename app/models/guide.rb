class Guide < ActiveRecord::Base
  validates :title, presence: true
end
