
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import React from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Switch } from '@/components/ui/switch';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@/components/ui/slider';
import { centerStyle } from "@/components/ui/center/styles";
import { Settings } from 'lucide-react-native';
import DateDisplay from "@/components/myComponents/DisplayDate/DisplayDate";



export default function homepage() {


  const dimensions = useWindowDimensions()
  const largeScreen = dimensions.width > 768; // tablet UI condition
  const mobileScreen = dimensions.width < 768;


  const styles =  StyleSheet.create({
    ControlContainer: {
      // backgroundColor: "#dfdfdfff",
      // flex: 1,
      borderWidth: 1,
      borderColor: "red",
      gap: 12,
      padding: 16,
      borderRadius: 12,
      minHeight: 270,
      maxHeight: "auto",
      width: "100%"
    },
    BG: {
      // borderWidth: 1,
      // backgroundColor: "#000000ff",
      paddingTop: 20,
      paddingLeft: 20,
      paddingRight: 20,
      paddingBottom: 20,
    }, 
    sensorIndecator: {
      borderRadius: 12,
      // backgroundColor:  "#bb56568a",
      justifyContent: "center",
      flex: 1,
      maxHeight: 200,
      minHeight: 140,
      borderWidth: 1,
    },
    sensorIndicatorBAr: {
      flex: 1,
      gap: 4,
      // alignItems: "center",
    },
    sensorName: {
      textAlign: "center",
      fontFamily: "lufga",
      fontSize: 16,
      fontWeight: "bold",
      width: "100%",
      borderWidth: 0,
    },
    textIndiactor: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#000000ff",
      textAlign: "center",
      borderWidth: 0,
    },
    Status: {
      borderWidth: 1,
      borderColor: "#000",
      // justifyContent: "center",
      alignItems: "center",
      flex: 2,
      borderRadius: 12,
      gap: 12,
      padding: 12,
    },
    controlSettings: {
      borderColor: "#000",
      borderWidth: 1,
      height: 50,
      width: 50,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    messageArea: {
      width: "100%",
      minHeight: 50,
      maxHeight: 100,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 0,
      borderRadius: 12,
      backgroundColor: "#AFDE4E",
    },
    controlArea: {
        borderWidth: 1,
        flex: 2,
        // padding: 40,
        // gap: 32,
    },
    dateSettingContainer: {
      borderWidth: 0,
      gap: 18,
      marginBottom: 14,
    },
    body: {
      borderWidth: 0,
      gap: 32,
    }
  })
 
return (
  <ScrollView style={{...styles.BG}}>

      {/* --------------------------------date and settings----------------- */}
      <HStack style={{...styles.dateSettingContainer}}>
        <HStack style={{...styles.Status}}>
          <Text>Status:</Text>
          <Text>Connected</Text>
        </HStack>
        <Box style={{...styles.controlSettings}}>
          <Settings size={30} color={"#000"}/>
        </Box>
      </HStack>

    <VStack style={{...styles.body}}>
        {/* --------------------------sensors---------------------------------- */}
        <HStack style={{gap: 4, borderWidth: 0, borderColor: "#000000ff", flex: 1}}>
        <VStack style={{...styles.sensorIndicatorBAr}}>
           <View style={{...styles.sensorIndecator}}>
            <Text style={{...styles.textIndiactor}}>100</Text>
          </View>
          <Text style={{...styles.sensorName}}>Humidity</Text>
        </VStack>
        <VStack style={{...styles.sensorIndicatorBAr}}>
          <View style={{...styles.sensorIndecator}}>
            <Text style={{...styles.textIndiactor}}>100</Text>
        </View>
         <Text style={{...styles.sensorName}}>Temp.</Text>
        </VStack>
        <VStack style={{...styles.sensorIndicatorBAr}}>
          <View style={{...styles.sensorIndecator}}>
            <Text style={{...styles.textIndiactor}}>100</Text>
        </View>
        <Text style={{...styles.sensorName}}>Moisture</Text>
        </VStack>
       <VStack style={{...styles.sensorIndicatorBAr}}>
         <View style={{...styles.sensorIndecator}}>
            <Text style={{...styles.textIndiactor}}>100</Text>
        </View>
        <Text style={{...styles.sensorName}}>Light</Text>
       </VStack>
      </HStack>

      {/* ------------------------------message area----------------------------------- */}
      <View style={{...styles.messageArea}}>
        <Text style={{
          fontSize: 12,
          fontWeight: "semibold",
        }}>Message Area</Text>
      </View>

    {/* ------------------------------control panel------------------------- */}
    <View style={{...styles.ControlContainer}}>
      <Box style={{borderWidth: 1, flex: 1, justifyContent: "center", alignItems: "center"}}>
          <Text style={{
            fontSize: 16,
            fontWeight: "bold",
            borderWidth: 1,
            borderColor: "#000"
          }}>Controls</Text>
      </Box>
      <View style={{...styles.controlArea}}>
          <VStack style={{
            justifyContent: "center", 
            alignItems:"center", 
            borderWidth: 1,
            flex: 1,
            // padding: 12,
            }}>
            
            <Switch
            size="md"
            isDisabled={false}
            trackColor={{ false: '#9c9c9cff', true: '#383838ff' }}
            thumbColor="#ffffffff"
             />
             <Text>Mist Huidifier</Text>
          </VStack>

          <VStack style={{
            justifyContent: "center", 
            alignItems:"center", 
            borderWidth: 1, 
            gap: 12,
            // padding: 12,
            flex: 1
            }}>
            
             <Slider
                defaultValue={30}
                size="md"
                orientation="horizontal"
                isDisabled={false}
                isReversed={false}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text>Light Brightness</Text>
          </VStack>
        </View>
    </View>
    
    </VStack>

  </ScrollView>
  )
}
