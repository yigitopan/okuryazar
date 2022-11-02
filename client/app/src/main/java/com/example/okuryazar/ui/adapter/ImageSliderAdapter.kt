package com.example.okuryazar.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import com.bumptech.glide.Glide
import com.example.okuryazar.R
import com.smarteist.autoimageslider.SliderViewAdapter

class ImageSliderAdapter(imageUrl: ArrayList<String>) :

    SliderViewAdapter<ImageSliderAdapter.SliderViewHolder>() {
    var sliderList: ArrayList<String> = imageUrl
    class SliderViewHolder (itemView: View?) : SliderViewAdapter.ViewHolder(itemView){
        var imageView: ImageView = itemView!!.findViewById(R.id.imageInSliderview)
    }

    override fun getCount(): Int {
        return sliderList.size
    }

    override fun onCreateViewHolder(parent: ViewGroup?): SliderViewHolder {
        val inflate: View = LayoutInflater.from(parent!!.context).inflate(R.layout.auto_image_slider_item, null)

        return SliderViewHolder(inflate)

    }

    override fun onBindViewHolder(viewHolder: SliderViewHolder?, position: Int) {

        if (viewHolder != null) {
            Glide.with(viewHolder.itemView).load(sliderList.get(position)).fitCenter()
                .into(viewHolder.imageView)
        }
    }
}