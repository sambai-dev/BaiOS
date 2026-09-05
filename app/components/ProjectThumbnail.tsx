// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import type { ReactNode } from "react";
import "./project-thumbnail.css";

export type ProjectThumbnailProps = {
  id: string;
  title: string;
  subtitle: string;
  gameCover?: string;
};

const illustrations: Record<string, ReactNode> = {
  market: (
    <>
      <path fill="#20221F" d="M0 76h480v202H0z" />
      <g stroke="#424C40" strokeWidth="1.5">
        <path d="M28 116h424M28 162h424M28 208h424M28 254h424M92 98v156M174 98v156M256 98v156M338 98v156M420 98v156" />
      </g>
        <path d="m30 232 36-19 32 9 31-50 30 9 31-34 30 20 31-44 30 18 33-30 27 14 34-31 35 10 43-35" fill="none" stroke="#9B9EFF" strokeWidth="5" strokeLinejoin="round" />
        <path d="M30 242c60-9 62-14 100-24s72-45 112-47 63-24 104-32 63-20 105-23" fill="none" stroke="#A6E3B3" strokeWidth="5" />
      <path d="M30 249c89-3 139-28 184-38s115-25 162-39 56-21 77-24" fill="none" stroke="#EDC66D" strokeWidth="4" />
      <g className="project-thumbnail__mono" fontSize="18" fontWeight="600">
          <text x="30" y="106" fill="#9B9EFF">PRICE</text>
          <text x="110" y="106" fill="#A6E3B3">EMA 20</text>
        <text x="211" y="106" fill="#EDC66D">EMA 50</text>
      </g>
    </>
  ),
  trekky: (
    <>
      <path fill="#5154E8" d="M0 76h480v202H0z" />
      <path d="M48 186h385" stroke="#AAACFA" strokeWidth="3" strokeDasharray="8 8" />
      <g transform="translate(43 103) rotate(-8 61 77)">
        <path d="M7 10h120v151H7z" fill="#292C88" />
        <rect width="120" height="151" rx="3" fill="#F2F0E5" />
        <path d="M0 37h120" stroke="#242722" strokeWidth="2" />
        <rect x="13" y="12" width="15" height="15" fill="#242722" />
        <path d="M38 19h56M14 58h90M14 75h66" stroke="#55584E" strokeWidth="5" />
        <path d="M14 115h48v20H14z" fill="#CDD0C0" />
      </g>
      <g transform="translate(177 103)">
        <path d="M7 10h120v151H7z" fill="#292C88" />
        <rect width="120" height="151" rx="3" fill="#F2F0E5" />
        <path d="M0 37h120" stroke="#242722" strokeWidth="2" />
        <rect x="13" y="12" width="15" height="15" fill="#5154E8" />
        <path d="M38 19h56M14 58h90M14 75h66" stroke="#55584E" strokeWidth="5" />
        <path d="M14 115h66v20H14z" fill="#CECEF7" />
      </g>
      <g transform="translate(310 104) rotate(8 61 77)">
        <path d="M7 10h120v151H7z" fill="#292C88" />
        <rect width="120" height="151" rx="3" fill="#F2F0E5" />
        <path d="M0 37h120" stroke="#242722" strokeWidth="2" />
        <rect x="13" y="12" width="15" height="15" fill="#4BDC79" />
        <path d="M38 19h56M14 58h90M14 75h66" stroke="#55584E" strokeWidth="5" />
        <path d="M14 115h85v20H14z" fill="#B6E4AE" />
      </g>
      <circle cx="392" cy="234" r="27" fill="#4BDC79" stroke="#20221F" strokeWidth="3" />
      <path d="m379 234 9 9 18-19" fill="none" stroke="#20221F" strokeWidth="5" />
    </>
  ),
  rookhold: (
    <>
      <path fill="#DEDED3" d="M0 76h480v202H0z" />
      <path d="M138 177h207" stroke="#22251F" strokeWidth="3" />
      <path d="m322 164 14 13-14 13" fill="none" stroke="#22251F" strokeWidth="3" />
      <g transform="translate(26 114)">
        <path d="M7 8h131v135H7z" fill="#B9BBAF" />
        <path d="M0 0h131v135H0z" fill="#22251F" />
        <path d="M0 30h131" stroke="#66695F" />
        <path d="M13 15h43" stroke="#F2F0E5" strokeWidth="4" />
        <path d="m39 58-17 16 17 16m53-32 17 16-17 16m-17-44-16 57" fill="none" stroke="#4BDC79" strokeWidth="5" />
      </g>
      <path d="M199 134h60v86h-60z" fill="#5154E8" />
      <path d="M208 127v-13m15 13v-13m15 13v-13m15 13v-13M208 226v13m15-13v13m15-13v13m15-13v13M192 146h-13m13 16h-13m13 16h-13m13 16h-13M266 146h13m-13 16h13m-13 16h13m-13 16h13" stroke="#5154E8" strokeWidth="4" />
      <path d="m217 159 25 18-25 18z" fill="#F2F0E5" />
      <g transform="translate(329 103)">
        <path d="M7 10h120v151l-10-7-12 7-12-7-12 7-12-7-12 7-12-7-12 7-12-7-7 5z" fill="#B9BBAF" />
        <path d="M0 0h120v151l-10-7-12 7-12-7-12 7-12-7-12 7-12-7-12 7-12-7-12 7z" fill="#F7F5EA" stroke="#242722" strokeWidth="2" />
        <circle cx="60" cy="47" r="25" fill="#4BDC79" />
        <path d="m48 47 8 8 17-17" fill="none" stroke="#20221F" strokeWidth="4" />
        <path d="M23 91h74M23 106h74M23 121h41" stroke="#74786A" strokeWidth="4" />
      </g>
    </>
  ),
  portly: (
    <>
      <path fill="#5154E8" d="M0 76h480v202H0z" />
      <path d="M31 112h419v150H31z" fill="#2D308D" />
      <path d="M23 103h419v150H23z" fill="#20221F" stroke="#B3B4F1" strokeWidth="2" />
      <g stroke="#494D42">
        <path d="M23 153h419M23 203h419M148 103v150M341 103v150" />
      </g>
      <g fill="#F2F0E5" className="project-thumbnail__mono" fontSize="25">
        <text x="46" y="137">:3000</text>
        <text x="46" y="187">:5432</text>
        <text x="46" y="237">:6379</text>
      </g>
      <g fill="#D1D5C7" className="project-thumbnail__mono" fontSize="20">
        <text x="169" y="135">node</text>
        <text x="169" y="185">postgres</text>
        <text x="169" y="235">redis</text>
      </g>
      <path d="M365 123h13v13h-13zM365 173h13v13h-13zM365 223h13v13h-13z" fill="#4BDC79" />
      <path d="m403 121 8 8-8 8m0 34 8 8-8 8m0 34 8 8-8 8" fill="none" stroke="#9EA593" strokeWidth="3" />
    </>
  ),
  agentscope: (
    <>
      <path fill="#222722" d="M0 76h480v202H0z" />
      <path d="M129 177h68m0 0v-62h80m-80 62h80m-80 0v62h80" stroke="#758470" strokeWidth="3" fill="none" />
      <path d="M175 177h22v-62h33" stroke="#4BDC79" strokeWidth="3" fill="none" />
      <rect x="25" y="124" width="117" height="107" rx="4" fill="#4B4FDC" />
      <path d="M42 145h31M42 159h65" stroke="#ACABFC" strokeWidth="4" />
      <text x="43" y="199" fill="#F2F0E5" fontSize="24" fontWeight="700" className="project-thumbnail__mono">AGENT</text>
      <g fill="#F2F0E5">
        <path d="M278 92h166v45H278zM278 154h166v45H278zM278 216h166v45H278z" />
      </g>
      <g fill="none" stroke="#292E25" strokeWidth="2.5">
        <path d="M293 102h16l7 7v18h-23zM308 103v7h7M298 116h12M298 121h8" />
        <path d="m301 165-8 10 8 10m10-20 8 10-8 10" />
        <circle cx="305" cy="238" r="12" />
        <path d="M293 238h24m-12-12c-8 6-8 18 0 24m0-24c8 6 8 18 0 24" />
      </g>
      <g fill="#292E25" fontSize="18" fontWeight="700" className="project-thumbnail__mono">
        <text x="331" y="121">FILES</text>
        <text x="331" y="183">TOOLS</text>
        <text x="331" y="245">NETWORK</text>
      </g>
      <circle cx="197" cy="177" r="5" fill="#4BDC79" />
      <circle cx="251" cy="115" r="5" fill="#4BDC79" />
    </>
  ),
  workbench: (
    <>
      <path fill="#5154E8" d="M0 76h480v202H0z" />
      <g transform="translate(33 97)">
        <path d="M9 11h283v158H9z" fill="#303293" />
        <path d="M0 0h283v158H0z" fill="#F2F0E5" stroke="#242722" strokeWidth="2" />
        <path d="M0 0h283v28H0z" fill="#242722" />
        <path d="M13 14h69m169 0h11" stroke="#F2F0E5" strokeWidth="4" />
        <path d="M0 28h57v130H0z" fill="#D8DBCF" />
        <path d="M12 44h29M12 61h23M12 78h31M12 111h26" stroke="#7B8271" strokeWidth="4" />
        <path d="M72 46h46v38H72zM130 46h46v38h-46zM188 46h46v38h-46z" fill="#5154E8" />
        <path d="M77 39h17l6 8H77zM135 39h17l6 8h-23zM193 39h17l6 8h-23z" fill="#5154E8" />
        <path d="M74 99h47M132 99h46M190 99h43" stroke="#929885" strokeWidth="4" />
      </g>
      <g transform="translate(196 166)">
        <path d="M8 10h252v97H8z" fill="#303293" />
        <path d="M0 0h252v97H0z" fill="#20221F" stroke="#B3B4F1" strokeWidth="2" />
        <path d="M0 0h252v25H0z" fill="#E1E1D5" />
        <path d="M11 12h49m159 0h14" stroke="#535A48" strokeWidth="3" />
        <path d="m15 43 8 7-8 7m21-7h54M15 70h127" fill="none" stroke="#4BDC79" strokeWidth="4" />
        <path d="M150 63h10v14h-10z" fill="#F2F0E5" />
      </g>
    </>
  ),
  vectors: (
    <>
      <path fill="#E0E1D6" d="M0 76h480v202H0z" />
      <path d="m67 199 158-91 189 110-111 60H203z" fill="#F2F0E5" />
      <g stroke="#AFB4A1" strokeWidth="1.3" fill="none">
        <path d="m68 199 190 110M109 175l190 110M148 151l190 110M188 128l190 110M225 108l189 110M110 223l158-92M150 246l158-92M191 270l158-92M237 287l151-87" />
      </g>
      <circle cx="236" cy="217" r="49" fill="none" stroke="#9DAB8E" strokeWidth="2" strokeDasharray="5 5" />
      <path d="M235 217V102m0 115L113 287m122-70 121 69" stroke="#30372A" strokeWidth="2" />
      <path d="m235 217 108-85" stroke="#5154E8" strokeWidth="9" />
      <path d="m330 125 32-9-16 29z" fill="#5154E8" />
      <path d="m235 217-67-84" stroke="#D76942" strokeWidth="9" />
      <path d="m160 147-11-32 29 17z" fill="#D76942" />
      <circle cx="235" cy="217" r="10" fill="#242722" />
      <circle cx="235" cy="217" r="3" fill="#F2F0E5" />
      <text x="371" y="125" fill="#5154E8" fontSize="24" fontWeight="700" className="project-thumbnail__mono">A</text>
      <text x="122" y="121" fill="#B34F2B" fontSize="24" fontWeight="700" className="project-thumbnail__mono">B</text>
    </>
  ),
  railshift: (
    <>
      <path fill="#5154E8" d="M0 76h480v202H0z" />
      <path d="m169 98-157 180h456L310 98z" fill="#20221F" />
      <path d="m200 98-89 180m160-180 88 180M240 98v180M162 126h158M139 157h205M107 197h268M65 248h353" fill="none" stroke="#89927D" strokeWidth="2" />
      <path d="M213 202h48v61h-48z" fill="#F2F0E5" />
      <path d="M221 210h32v26h-32z" fill="#5154E8" />
      <path d="M203 256h68v9h-68zM168 164h21v24h-21zM292 145h15v18h-15z" fill="#4BDC79" />
    </>
  ),
  subsurface: (
    <>
      <path fill="#2E39A6" d="M0 76h480v202H0z" />
      <path d="M0 213c111-41 163 50 291 14s139-23 189 1v50H0z" fill="#24317C" />
      <g stroke="#8187CE" fill="none" opacity=".5">
        <circle cx="166" cy="183" r="55" />
        <circle cx="166" cy="183" r="91" />
        <circle cx="166" cy="183" r="128" />
      </g>
      <path d="M345 76h43v63h-43zM345 228h43v50h-43z" fill="#20221F" />
      <path d="M351 125h31m-31 7h31m-31 103h31m-31 7h31" stroke="#4BDC79" strokeWidth="4" />
      <path d="m121 183-20-16v34z" fill="#F2F0E5" />
      <ellipse cx="160" cy="183" rx="54" ry="21" fill="#F2F0E5" />
      <circle cx="183" cy="179" r="6" fill="#5154E8" />
      <path d="M145 162v-12h12" fill="none" stroke="#4BDC79" strokeWidth="4" />
    </>
  ),
};

/** Purpose-led cover art: readable titles, simplified product UI, shared cartridge frame. */
export default function ProjectThumbnail({ id, title, subtitle, gameCover }: ProjectThumbnailProps) {
  const isGame = id === "railshift" || id === "subsurface";
  return (
    <span className={`project-thumbnail project-thumbnail--${id}`}>
      <svg viewBox="0 0 480 320" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
        <path fill="#F2F0E5" d="M0 0h480v320H0z" />
        {isGame && gameCover ? (
          <>
            <image href={gameCover} x="0" y="72" width="480" height="210" preserveAspectRatio="xMidYMid slice" />
            <path d="M0 76h480v202H0z" fill="#151A24" opacity=".05" />
          </>
        ) : illustrations[id] ?? illustrations.workbench}
        <path fill="#20221F" d="M0 0h480v77H0z" />
        <text x="22" y="57" className="project-thumbnail__title" fontSize={title.length > 10 ? 43 : 50}>{title}</text>
        <path d="M433 26v27m10-27v27m10-27v27" stroke="#858B79" strokeWidth="3" />
        <path d="M22 77h90" stroke="#4BDC79" strokeWidth="4" />
        <path fill="#F2F0E5" d="M0 278h480v42H0z" />
        <path d="M0 278h480" stroke="#20221F" strokeWidth="2" />
        <text x="22" y="305" className="project-thumbnail__subtitle" fontSize={subtitle.length > 31 ? 16 : 18}>{subtitle}</text>
        <path d="M456 292v15h-15" fill="none" stroke="#5154E8" strokeWidth="3" />
        <path d="M2 2h476v316H2z" fill="none" stroke="#20221F" strokeWidth="4" />
      </svg>
    </span>
  );
}
