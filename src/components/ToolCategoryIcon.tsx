import TextFieldsOutlinedIcon from '@mui/icons-material/TextFieldsOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import NumbersOutlinedIcon from '@mui/icons-material/NumbersOutlined';
import GifBoxOutlinedIcon from '@mui/icons-material/GifBoxOutlined';
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined';
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import AudiotrackOutlinedIcon from '@mui/icons-material/AudiotrackOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import TransformOutlinedIcon from '@mui/icons-material/TransformOutlined';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ToolCategory } from '@tools/defineTool';

const categoryIcons = {
  audio: AudiotrackOutlinedIcon,
  converters: TransformOutlinedIcon,
  csv: TableChartOutlinedIcon,
  gif: GifBoxOutlinedIcon,
  'image-generic': ImageOutlinedIcon,
  json: DataObjectOutlinedIcon,
  list: FormatListBulletedOutlinedIcon,
  network: HubOutlinedIcon,
  number: NumbersOutlinedIcon,
  ops: TerminalOutlinedIcon,
  pdf: PictureAsPdfOutlinedIcon,
  png: ImageOutlinedIcon,
  string: TextFieldsOutlinedIcon,
  time: ScheduleOutlinedIcon,
  video: VideoLibraryOutlinedIcon,
  xml: CodeOutlinedIcon
} satisfies Record<ToolCategory, typeof CodeOutlinedIcon>;

export function getToolCategoryIcon(category?: string) {
  return categoryIcons[category as ToolCategory] ?? CodeOutlinedIcon;
}

export default function ToolCategoryIcon({
  category,
  ...props
}: SvgIconProps & { category?: string }) {
  const Icon = getToolCategoryIcon(category);

  return <Icon {...props} />;
}
