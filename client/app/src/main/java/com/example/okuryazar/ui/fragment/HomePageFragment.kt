package com.example.okuryazar.ui.fragment

import android.os.Bundle
import androidx.fragment.app.Fragment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.example.okuryazar.R
import com.example.okuryazar.databinding.FragmentHomePageBinding
import com.example.okuryazar.ui.adapter.ImageSliderAdapter
import com.smarteist.autoimageslider.SliderView

class HomePageFragment : Fragment() {
    private var _binding: FragmentHomePageBinding? = null

    private val binding get() = _binding!!

    private lateinit var imageUrl: ArrayList<String>

    private lateinit var sliderView: SliderView

    private lateinit var sliderAdapter: ImageSliderAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        // Inflate the layout for this fragment
        _binding = FragmentHomePageBinding.inflate(inflater, container, false)
        val view = binding.root
        sliderView = binding.sliderView

        // on below line we are initializing
        // our image url array list.
        imageUrl = ArrayList()

        // on below line we are adding data to our image url array list.
        imageUrl =
            (imageUrl + "https://iasbh.tmgrup.com.tr/20bf58/0/0/0/0/700/394?u=https://isbh.tmgrup.com.tr/sbh/2022/11/02/son-dakika-siyasi-partilere-basortusu-teklifi-ziyareti-1667391415315.jpg&mw=650") as ArrayList<String>
        imageUrl =
            (imageUrl + "https://iasbh.tmgrup.com.tr/800827/0/0/0/0/0/0?u=https://isbh.tmgrup.com.tr/sb/album/2022/11/01/son-dakika-fenerbahce-transfer-haberi-ronaldonun-takim-arkadasi-fenerbahce-yolcusu-kanarya-yilin-transferi-ici-1667316990321.jpg") as ArrayList<String>
        imageUrl =
            (imageUrl + "https://iasbh.tmgrup.com.tr/8dfc9b/752/395/0/179/741/568?u=https://isbh.tmgrup.com.tr/sbh/2022/11/01/kazdaglarindaki-yanginlarda-sabotaj-ihtimali-1667326272785.jpeg") as ArrayList<String>

        // on below line we are initializing our
        // slider adapter and adding our list to it.
        sliderAdapter = ImageSliderAdapter( imageUrl)

        // on below line we are setting auto cycle direction
        // for our slider view from left to right.
        sliderView.autoCycleDirection = SliderView.LAYOUT_DIRECTION_LTR

        // on below line we are setting adapter for our slider.
        sliderView.setSliderAdapter(sliderAdapter)

        // on below line we are setting scroll time
        // in seconds for our slider view.
        sliderView.scrollTimeInSec = 3

        // on below line we are setting auto cycle
        // to true to auto slide our items.
        sliderView.isAutoCycle = true

        // on below line we are calling start
        // auto cycle to start our cycle.
        sliderView.startAutoCycle()
        return view

    }
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

}