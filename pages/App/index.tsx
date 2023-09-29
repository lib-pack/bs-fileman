"use client";
import { Col, Image, Row, Spin, Empty } from "@douyinfe/semi-ui";
import {
  IllustrationNoContent,
  IllustrationNoContentDark,
} from "@douyinfe/semi-illustrations";

import styles from "./index.module.css";
import React, { useEffect, useState } from "react";
import FilerobotImageEditor, {
  TABS,
  TOOLS,
} from "react-filerobot-image-editor";
import { IOpenAttachment } from "@lark-base-open/js-sdk";
let initd = false;

let base = null;

export default function App() {
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(-1);
  const [selected, setSelected] = useState(undefined);

  const init = async () => {
    if (initd) {
      return;
    }
    initd = true;
    const { bitable } = await import("@lark-base-open/js-sdk");
    const table = await bitable.base.getActiveTable();
    base = table.base;
    base.onSelectionChange(async () => {
      console.log("onSelectionChange");
      setLoading(true);
      setSelected(undefined);
      try {
        const selected = {
          field: null,
          select: null,
          selectImages: [],
        };
        const select = await base.getSelection();
        const field = await table.getField(select.fieldId);
        // const cell = await field.getCell(select.recordId);
        const urls = await field.getAttachmentUrls(select.recordId);
        const vals = await field.getValue(select.recordId);
        selected.field = field;
        selected.select = select;
        vals.map((val, i) => {
          selected.selectImages.push({
            val,
            url: urls[i],
          });
        });
        console.log("onSelectionChange", selected);
        setSelected(selected);
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    init();
    console.log("创建");
    return () => {
      console.log("销毁");
    };
  });

  const openImgEditor = (index: number) => {
    setCurrent(index);
  };

  const closeImgEditor = () => {
    setCurrent(-1);
  };

  const saveImgEditor = () => {};

  return (
    <div>
      {loading ? (
        <Spin
          size="large"
          style={{ margin: "50vh 50vw", transform: "translate(-50%, -50%)" }}
        />
      ) : !selected ? (
        <Empty
          image={<IllustrationNoContent style={{ width: 150, height: 150 }} />}
          darkModeImage={
            <IllustrationNoContentDark style={{ width: 150, height: 150 }} />
          }
          description={"请选择有图片的单元格"}
          style={{ marginTop: "20vh" }}
        />
      ) : current === -1 ? (
        <div className={styles["block-image"]}>
          {selected?.selectImages?.map((img, index) => {
            return (
              <div className={styles["image-item"]} key={img.url}>
                <img
                  className={styles["image"]}
                  src={img.url}
                  alt={img.val.name}
                  style={{ width: "100%", height: "100%" }}
                  onClick={() => openImgEditor(index)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ height: "100vh" }}>
          <FilerobotImageEditor
            translations={zhlang}
            source={selected.selectImages[current].url}
            onSave={async (editedImageObject, designState) => {
              console.log("saved", editedImageObject, designState);
              const file = canvasToFile(
                editedImageObject.imageCanvas,
                editedImageObject.fullName,
                editedImageObject.mimeType
              );
              console.log(file);
              // downloadFile(file);
              const currentSelected = selected.selectImages[current];
              const newSelectImages = [].concat(selected.selectImages);
              newSelectImages[current] = {
                val: await fileToIOpenAttachment(base, file),
                url: await fileToURL(file),
              };
              console.log("onSave", currentSelected, current, newSelectImages);

              await selected.field.setValue(
                selected.select.recordId,
                newSelectImages.map((item) => item.val)
              );
              selected.selectImages = newSelectImages;
              setSelected(selected);
            }}
            onClose={closeImgEditor}
            annotationsCommon={{
              fill: "#ff0000",
            }}
            // showCanvasOnly
            Text={{ text: "Text" }}
            Rotate={{ angle: 90, componentType: "slider" }}
            Crop={{
              presetsItems: [
                {
                  titleKey: "classicTv",
                  descriptionKey: "4:3",
                  ratio: 4 / 3,
                  // icon: CropClassicTv, // optional, CropClassicTv is a React Function component. Possible (React Function component, string or HTML Element)
                },
                {
                  titleKey: "cinemascope",
                  descriptionKey: "21:9",
                  ratio: 21 / 9,
                  // icon: CropCinemaScope, // optional, CropCinemaScope is a React Function component.  Possible (React Function component, string or HTML Element)
                },
              ],
              presetsFolders: [
                {
                  titleKey: "socialMedia",

                  // icon: Social, // optional, Social is a React Function component. Possible (React Function component, string or HTML Element)
                  groups: [
                    {
                      titleKey: "facebook",
                      items: [
                        {
                          titleKey: "profile",
                          width: 180,
                          height: 180,
                          descriptionKey: "fbProfileSize",
                        },
                        {
                          titleKey: "coverPhoto",
                          width: 820,
                          height: 312,
                          descriptionKey: "fbCoverPhotoSize",
                        },
                      ],
                    },
                  ],
                },
              ],
            }}
            tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK]} // or {['Adjust', 'Annotate', 'Watermark']}
            defaultTabId={TABS.ANNOTATE} // or 'Annotate'
            defaultToolId={TOOLS.TEXT} // or 'Text'
            savingPixelRatio={4}
            previewPixelRatio={0}
          />
        </div>
      )}
    </div>
  );
}

async function fileToIOpenAttachment(
  base: any,
  file: File
): Promise<IOpenAttachment> {
  const tokens = await base.batchUploadFile([file]);
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    token: tokens[0],
    timeStamp: file.lastModified,
  };
}

function downloadFile(file) {
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(file);
  downloadLink.download = file.name;
  downloadLink.click();
}

function fileToURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}

function canvasToFile(canvas, fileName, fileType = "image/png") {
  // 获取Canvas上的图像数据（这里假设图像数据为DataURL）
  const imageDataURL = canvas.toDataURL(fileType);

  // 将DataURL转换为Blob对象
  const blob = dataURLToBlob(imageDataURL);

  // 创建File对象
  const file = new File([blob], fileName, { type: fileType });

  return file;
}

// 将DataURL转换为Blob对象的辅助函数
function dataURLToBlob(dataURL) {
  const byteString = atob(dataURL.split(",")[1]);
  const mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer], { type: mimeString });
}

const zhlang = {
  name: "名称",
  save: "保存",
  saveAs: "另存为",
  back: "返回",
  loading: "正在加载...",
  resetOperations: "重置/删除所有操作",
  changesLoseConfirmation: "所有更改将丢失",
  changesLoseConfirmationHint: "确定要继续吗？",
  cancel: "取消",
  continue: "继续",
  undoTitle: "撤销上一次操作",
  redoTitle: "重做上一次操作",
  showImageTitle: "显示原始图像",
  zoomInTitle: "放大",
  zoomOutTitle: "缩小",
  toggleZoomMenuTitle: "切换缩放菜单",
  adjustTab: "调整",
  finetuneTab: "微调",
  filtersTab: "滤镜",
  watermarkTab: "水印",
  annotateTab: "绘制",
  resize: "调整大小",
  resizeTab: "调整大小",
  invalidImageError: "提供的图像无效。",
  uploadImageError: "上传图像时出错。",
  areNotImages: "不是图像",
  isNotImage: "不是图像",
  toBeUploaded: "待上传",
  cropTool: "裁剪",
  original: "原始",
  custom: "自定义",
  square: "正方形",
  landscape: "横向",
  portrait: "纵向",
  ellipse: "椭圆形",
  classicTv: "经典电视",
  cinemascope: "电影宽屏",
  arrowTool: "箭头",
  blurTool: "模糊",
  brightnessTool: "亮度",
  contrastTool: "对比度",
  ellipseTool: "椭圆",
  unFlipX: "取消水平翻转",
  flipX: "水平翻转",
  unFlipY: "取消垂直翻转",
  flipY: "垂直翻转",
  hsvTool: "HSV",
  hue: "色调",
  saturation: "饱和度",
  value: "明度",
  imageTool: "图像",
  importing: "导入中...",
  addImage: "+ 添加图像",
  uploadImage: "上传图像",
  fromGallery: "从图库",
  lineTool: "直线",
  penTool: "钢笔",
  polygonTool: "多边形",
  sides: "边数",
  rectangleTool: "矩形",
  cornerRadius: "圆角半径",
  resizeWidthTitle: "宽度（像素）",
  resizeHeightTitle: "高度（像素）",
  toggleRatioLockTitle: "切换比例锁定",
  reset: "重置",
  resetSize: "重置为原始图像大小",
  rotateTool: "旋转",
  textTool: "文本",
  textSpacings: "文本间距",
  textAlignment: "文本对齐",
  fontFamily: "字体族",
  size: "大小",
  letterSpacing: "字间距",
  lineHeight: "行高",
  warmthTool: "温暖度",
  addWatermark: "+ 添加水印",
  addTextWatermark: "+ 添加文本水印",
  addWatermarkTitle: "选择水印类型",
  uploadWatermark: "上传水印",
  addWatermarkAsText: "作为文本添加",
  padding: "内边距",
  shadow: "阴影",
  horizontal: "水平",
  vertical: "垂直",
  blur: "模糊",
  opacity: "不透明度",
  position: "位置",
  stroke: "描边",
  saveAsModalLabel: "另存为图片",
  extension: "扩展名",
  nameIsRequired: "名称不能为空。",
  quality: "质量",
  imageDimensionsHoverTitle: "保存图像尺寸（宽 x 高）",
  cropSizeLowerThanResizedWarning:
    "注意，所选的裁剪区域小于应用的调整大小，可能会导致质量降低",
  actualSize: "实际大小（100%）",
  fitSize: "适应大小",
  addImageTitle: "选择要添加的图像...",
  mutualizedFailedToLoadImg: "加载图像失败。",
};
