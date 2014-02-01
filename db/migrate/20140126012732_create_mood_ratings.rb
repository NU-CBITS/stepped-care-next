class CreateMoodRatings < ActiveRecord::Migration
  def change
    create_table :mood_ratings do |t|
      t.string :guid
      t.integer :rating
      t.string :user_id

      t.timestamps
    end
  end
end
